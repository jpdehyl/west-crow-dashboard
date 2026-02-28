// POST /api/bids/[id]/send-to-clark
// Clark reads Dropbox documents and pre-fills the estimate builder.
// Flow: Dropbox token → download docs → Claude analysis → store clark_draft

import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid, addBidTimeline } from "@/lib/sheets"
import { DEFAULT_SECTIONS, DEFAULT_SUBTRADES, DEFAULT_CONFIG } from "@/lib/estimate-data"
import type { Section, EstimateMeta } from "@/lib/estimate-data"
import { extractDropboxPath, isDropboxSharedLink, isDropboxUrl } from "@/lib/dropbox"

export const dynamic = "force-dynamic"
export const maxDuration = 120

type Ctx = { params: Promise<{ id: string }> }

// ── Dropbox helpers ──────────────────────────────────────────────────────────

async function getDropboxToken(): Promise<string> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim()
  const appKey       = process.env.DROPBOX_APP_KEY?.trim()
  const appSecret    = process.env.DROPBOX_APP_SECRET?.trim()

  if (refreshToken && appKey && appSecret) {
    const res = await fetch("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${appKey}&client_secret=${appSecret}`,
    })
    if (res.ok) {
      const data = await res.json()
      if (data.access_token) return data.access_token
    }
  }
  const token = process.env.DROPBOX_TOKEN
  if (!token) throw new Error("No Dropbox credentials configured")
  return token
}

async function getTemporaryLink(path: string, token: string): Promise<string | null> {
  const res = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.link ?? null
}

function buildDropboxListBody(pathOrLink: string): { path: string; recursive: boolean; shared_link?: { url: string } } {
  const normalizedPath = extractDropboxPath(pathOrLink)
  if (normalizedPath) return { path: normalizedPath, recursive: true }
  if (isDropboxSharedLink(pathOrLink)) return { path: "", recursive: true, shared_link: { url: pathOrLink } }
  return { path: pathOrLink, recursive: true }
}

async function listFolderRecursive(pathOrLink: string, token: string): Promise<any[]> {
  const body = buildDropboxListBody(pathOrLink)

  const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return []
  const data = await res.json()

  let entries = data.entries ?? []
  let cursor = data.cursor

  while (data.has_more && cursor) {
    const nextRes = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor }),
    })
    if (!nextRes.ok) break
    const nextData = await nextRes.json()
    entries = entries.concat(nextData.entries ?? [])
    cursor = nextData.cursor
    if (!nextData.has_more) break
  }

  return entries
}

async function getDropboxMetadata(pathOrLink: string, token: string): Promise<any | null> {
  const normalizedPath = extractDropboxPath(pathOrLink)
  const body = normalizedPath
    ? { path: normalizedPath }
    : isDropboxSharedLink(pathOrLink)
      ? { path: "", shared_link: { url: pathOrLink } }
      : { path: pathOrLink }

  const res = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) return null
  return await res.json()
}

function filenameFromUrl(url: string): string {
  const cleaned = url.split("?")[0].split("#")[0]
  const piece = cleaned.split("/").filter(Boolean).pop() ?? "document"
  try { return decodeURIComponent(piece) } catch { return piece }
}

async function searchFolderByProjectName(projectName: string, token: string): Promise<string | null> {
  if (!projectName) return null

  const res = await fetch("https://api.dropboxapi.com/2/files/search_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: projectName,
      options: {
        path: "",
        max_results: 25,
        file_status: "active",
        filename_only: true,
      },
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const matches = (data.matches ?? []) as any[]
  const folders = matches
    .map((match) => match.metadata?.metadata)
    .filter((metadata) => metadata?.[".tag"] === "folder" && typeof metadata.path_display === "string")

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")
  const normalizedProject = normalize(projectName)
  const exact = folders.find((folder) => normalize(String(folder.name ?? "")) === normalizedProject)

  return exact?.path_display ?? folders[0]?.path_display ?? null
}

// ── File helpers ──────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".csv"]
const MAX_FILE_SIZE  = 20 * 1024 * 1024 // 20MB

function getMediaType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? ""
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain",
    csv: "text/csv",
  }
  return map[ext] ?? "application/octet-stream"
}

function isSupported(filename: string): boolean {
  const lc = filename.toLowerCase()
  return SUPPORTED_EXTS.some(ext => lc.endsWith(ext))
}

// ── Clark analysis ────────────────────────────────────────────────────────────

interface ClarkOutput {
  scope_summary:  string
  line_items:     { description: string; quantity: number; unit: string; notes: string }[]
  assumptions:    string[]
  exclusions:     string[]
  hazmat_present: boolean
  confidence:     number
}

async function analyzeWithClaude(
  docPayloads: { filename: string; mediaType: string; base64: string }[],
  bidName: string,
  extraNote: string
): Promise<ClarkOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const contentBlocks: any[] = []

  contentBlocks.push({
    type: "text",
    text: [
      `You are Clark, an expert construction estimator's assistant for West Crow Contracting.`,
      `Analyze the following documents for bid: "${bidName}".`,
      extraNote ? `JP's note: ${extraNote}` : null,
      ``,
      `West Crow specializes in demolition, selective demo, hazmat abatement (ACM/LBP), and concrete work.`,
      `Labour rate: $296/man-day. Materials: 18% of labour. Overhead: 12%. Profit: 30%.`,
      ``,
      `Extract scope and quantities. Return ONLY a valid JSON object (no markdown, no explanation):`,
      `{`,
      `  "scope_summary": "Brief scope description",`,
      `  "line_items": [{"description": "...", "quantity": 0, "unit": "SF|EA|LF|LS|CY|day", "notes": "..."}],`,
      `  "assumptions": ["assumption 1", ...],`,
      `  "exclusions": ["exclusion 1", ...],`,
      `  "hazmat_present": true|false,`,
      `  "confidence": 0.0-1.0`,
      `}`,
    ].filter(Boolean).join("\n"),
  })

  for (const doc of docPayloads) {
    const isImage = doc.mediaType.startsWith("image/")
    const isPdf   = doc.mediaType === "application/pdf"
    const isText  = doc.mediaType.startsWith("text/")

    if (isImage) {
      contentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: doc.mediaType, data: doc.base64 },
      })
      contentBlocks.push({ type: "text", text: `[Above image: ${doc.filename}]` })
    } else if (isPdf) {
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: doc.base64 },
        title: doc.filename,
      })
    } else if (isText) {
      const text = Buffer.from(doc.base64, "base64").toString("utf-8").slice(0, 50000)
      contentBlocks.push({ type: "text", text: `[File: ${doc.filename}]\n${text}` })
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const result = await response.json()
  const text   = result.content?.[0]?.text ?? "{}"

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Clark returned invalid JSON")

  return JSON.parse(jsonMatch[0]) as ClarkOutput
}

// ── Map Clark output → estimate sections ──────────────────────────────────────

const KEYWORD_MAP: { keywords: string[]; sectionId: string; itemId?: string }[] = [
  { keywords: ["vft", "vinyl", "floor tile", "mastic", "floor covering", "vct"], sectionId: "vft_mastic" },
  { keywords: ["drywall", "plaster", "ceiling tile", "t-bar", "t bar", "suspended ceiling", "lay-in"], sectionId: "drywall_ceiling" },
  { keywords: ["acm pipe", "pipe insulation", "boiler", "hvac insulation", "mechanical insulation"], sectionId: "acm_pipe" },
  { keywords: ["spray", "tsac", "fireproofing", "transite"], sectionId: "spray_tsac" },
  { keywords: ["concrete", "slab", "topping", "grinding", "shot blast", "scarify"], sectionId: "concrete_topping" },
  { keywords: ["brick", "masonry", "block", "cmu"], sectionId: "masonry" },
  { keywords: ["structural", "heavy demo", "selective demo"], sectionId: "structural_demo" },
  { keywords: ["mobilization", "mob", "setup", "site setup"], sectionId: "mob", itemId: "mob" },
  { keywords: ["demobilization", "demob", "cleanup"], sectionId: "mob", itemId: "demob" },
  { keywords: ["debris", "waste", "hauling", "disposal", "bin", "truck"], sectionId: "waste" },
]

function mapLineItemsToSections(
  lineItems: ClarkOutput["line_items"],
  defaultSections: Section[]
): Section[] {
  const sections = JSON.parse(JSON.stringify(defaultSections)) as Section[]

  for (const item of lineItems) {
    const desc  = item.description.toLowerCase()
    const match = KEYWORD_MAP.find(m => m.keywords.some(k => desc.includes(k)))
    if (!match) continue

    const sec = sections.find(s => s.id === match.sectionId)
    if (!sec) continue

    const targetItem = match.itemId
      ? sec.items.find(i => i.id === match.itemId)
      : sec.items[0]

    if (!targetItem) continue

    if (item.quantity > 0) targetItem.units = item.quantity
    targetItem.active   = true
    if (item.notes)    targetItem.notes = item.notes
    sec.expanded = true
  }

  return sections
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id }  = await params
  const body    = await req.json()
  const { bidName, dropboxFolder, documents, extraNote } = body

  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const folder: string = dropboxFolder || bid.dropbox_folder || ""

  // Mark clark_working
  const existingEstimate = bid.estimate_data
    ? (() => { try { return JSON.parse(bid.estimate_data) } catch { return {} } })()
    : {}

  await updateBid(id, {
    ...(dropboxFolder ? { dropbox_folder: dropboxFolder } : {}),
    estimate_data: JSON.stringify({
      ...existingEstimate,
      meta: {
        ...(existingEstimate.meta ?? {}),
        status: "clark_working",
        clark_triggered_at: new Date().toISOString(),
        prepared_by: "Clark",
        assumptions: existingEstimate.meta?.assumptions ?? [],
      },
    }),
  })

  // Get Dropbox token
  let token: string
  try {
    token = await getDropboxToken()
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  // Collect files to analyze
  const filesToAnalyze: { filename: string; dropboxPath: string }[] = []
  const bidDocs: { name: string; url: string; type: string }[] = documents ?? bid.documents ?? []

  for (const doc of bidDocs) {
    if (!doc.url) continue

    const dropboxCandidate = doc.url.startsWith("/") || isDropboxUrl(doc.url)
    if (!dropboxCandidate) continue

    try {
      const subEntries = await listFolderRecursive(doc.url, token)
      for (const entry of subEntries) {
        if (entry[".tag"] === "file" && isSupported(entry.name)) {
          filesToAnalyze.push({ filename: entry.name, dropboxPath: entry.id ?? entry.path_display })
        }
      }
      if (subEntries.length > 0) continue
    } catch {}

    const metadata = await getDropboxMetadata(doc.url, token)
    if (metadata?.[".tag"] === "file") {
      const filename = metadata.name ?? doc.name ?? filenameFromUrl(doc.url)
      if (isSupported(filename)) {
        filesToAnalyze.push({ filename, dropboxPath: metadata.id ?? metadata.path_display })
      }
    } else if (isSupported(doc.name ?? "")) {
      const normalizedPath = extractDropboxPath(doc.url) ?? doc.url
      filesToAnalyze.push({ filename: doc.name, dropboxPath: normalizedPath })
    }
  }

  // Fallback: list top-level folder
  if (filesToAnalyze.length === 0 && folder && (folder.startsWith("/") || isDropboxUrl(folder))) {
    try {
      const entries = await listFolderRecursive(folder, token)
      for (const entry of entries) {
        if (entry[".tag"] === "file" && isSupported(entry.name)) {
          filesToAnalyze.push({ filename: entry.name, dropboxPath: entry.id ?? entry.path_display })
        }
      }
    } catch {}
  }

  // Recovery fallback: discover correct folder by bid/project name if configured folder is stale
  if (filesToAnalyze.length === 0) {
    const discoverName = bidName || bid.project_name || ""
    const discoveredFolder = await searchFolderByProjectName(discoverName, token)
    if (discoveredFolder) {
      try {
        const entries = await listFolderRecursive(discoveredFolder, token)
        for (const entry of entries) {
          if (entry[".tag"] === "file" && isSupported(entry.name)) {
            filesToAnalyze.push({ filename: entry.name, dropboxPath: entry.id ?? entry.path_display })
          }
        }
        if (filesToAnalyze.length > 0) {
          await updateBid(id, { dropbox_folder: discoveredFolder })
        }
      } catch {}
    }
  }

  const deduped = Array.from(new Map(filesToAnalyze.map(file => [file.dropboxPath, file])).values())

  // Download and encode files (max 10, 20MB each)
  const docPayloads: { filename: string; mediaType: string; base64: string }[] = []
  const errors: string[] = []

  for (const file of deduped.slice(0, 10)) {
    try {
      const link = await getTemporaryLink(file.dropboxPath, token)
      if (!link) { errors.push(`No link for ${file.filename}`); continue }

      const dlRes = await fetch(link)
      if (!dlRes.ok) { errors.push(`Failed to download ${file.filename}`); continue }

      const buffer = await dlRes.arrayBuffer()
      if (buffer.byteLength > MAX_FILE_SIZE) {
        errors.push(`${file.filename} too large, skipped`)
        continue
      }

      docPayloads.push({
        filename:  file.filename,
        mediaType: getMediaType(file.filename),
        base64:    Buffer.from(buffer).toString("base64"),
      })
    } catch (e: any) {
      errors.push(`Error with ${file.filename}: ${e.message}`)
    }
  }

  // Timeline entry
  await addBidTimeline(id, {
    stage: "estimating",
    note: `Clark: ${docPayloads.length} doc(s) analyzed${extraNote ? " — JP note: " + extraNote : ""}${errors.length > 0 ? ` (${errors.length} skipped)` : ""}`,
    by: "JP",
  })

  // Analyze with Claude
  let clarkOutput: ClarkOutput
  if (docPayloads.length > 0) {
    try {
      clarkOutput = await analyzeWithClaude(docPayloads, bidName || bid.project_name, extraNote || "")
    } catch (e: any) {
      await updateBid(id, {
        estimate_data: JSON.stringify({
          ...existingEstimate,
          meta: {
            ...(existingEstimate.meta ?? {}),
            status: "clark_draft",
            clark_notes: `⚠️ Clark AI error: ${e.message}`,
            prepared_by: "Clark",
            prepared_at: new Date().toISOString(),
            assumptions: [],
          },
        }),
      })
      return NextResponse.json({ ok: true, warning: e.message, docs: 0 })
    }
  } else {
    clarkOutput = {
      scope_summary: "No documents available for analysis. Please attach bid documents and re-send to Clark.",
      line_items:    [],
      assumptions:   ["No documents found in linked Dropbox folder — manual entry required"],
      exclusions:    [],
      hazmat_present: false,
      confidence:    0,
    }
  }

  // Map line items to sections
  const sections = mapLineItemsToSections(clarkOutput.line_items, DEFAULT_SECTIONS)

  // Build assumptions list
  const assumptions = [
    ...clarkOutput.assumptions.map((text, i) => ({
      id:       `clark-a-${i}`,
      severity: "warn" as const,
      source:   "Clark AI analysis",
      text,
      resolved: false,
    })),
    ...clarkOutput.exclusions.map((text, i) => ({
      id:       `clark-e-${i}`,
      severity: "info" as const,
      source:   "Clark exclusions",
      text:     `EXCLUDED: ${text}`,
      resolved: false,
    })),
    ...(clarkOutput.hazmat_present ? [{
      id:       "clark-hazmat",
      severity: "flag" as const,
      source:   "Clark AI analysis",
      text:     "Hazmat materials detected — confirm scope and quantities with certified report",
      resolved: false,
    }] : []),
  ]

  const meta: EstimateMeta & { clark_confidence?: number } = {
    status:            "clark_draft",
    clark_notes:       clarkOutput.scope_summary,
    prepared_by:       "Clark",
    prepared_at:       new Date().toISOString(),
    assumptions,
    clark_confidence:  clarkOutput.confidence,
  }

  const estimateData = {
    config:      DEFAULT_CONFIG,
    sections,
    subtrades:   DEFAULT_SUBTRADES,
    meta,
    clark_draft: clarkOutput,
    grand_total: 0,
  }

  // Save to Supabase
  await updateBid(id, {
    estimate_data: JSON.stringify(estimateData),
    status:        "clark_draft",
  })

  // Optional Clark webhook (non-fatal)
  const clarkWebhook = process.env.CLARK_WEBHOOK_URL
  if (clarkWebhook) {
    await fetch(clarkWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bid_id:    id,
        bid_name:  bidName || bid.project_name,
        clark_draft: clarkOutput,
        message:   `📐 Clark completed analysis for **${bidName || bid.project_name}**\n• Confidence: ${Math.round((clarkOutput.confidence ?? 0) * 100)}%\n• ${clarkOutput.line_items?.length ?? 0} line items extracted\n• Review: ${process.env.NEXTAUTH_URL || "https://west-crow-dashboard.vercel.app"}/bids/${id}/estimate`,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({
    ok:            true,
    docs_analyzed: docPayloads.length,
    line_items:    clarkOutput.line_items?.length ?? 0,
    confidence:    clarkOutput.confidence,
    errors,
  })
}

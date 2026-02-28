// POST /api/bids/[id]/send-to-clark
// Clark reads Dropbox documents and pre-fills the estimate builder.
// Flow: Dropbox token → download docs → Claude analysis → store clark_questions

import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid, addBidTimeline } from "@/lib/sheets"
import { DEFAULT_SECTIONS, DEFAULT_SUBTRADES, DEFAULT_CONFIG } from "@/lib/estimate-data"
import type { EstimateMeta } from "@/lib/estimate-data"
import { promises as fs } from "fs"
import path from "path"

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

function isDropboxSharedLink(value: string): boolean {
  return /^https?:\/\/(www\.)?dropbox\.com\//i.test(value)
}

async function listFolderRecursive(pathOrLink: string, token: string): Promise<any[]> {
  const body = isDropboxSharedLink(pathOrLink)
    ? { path: "", recursive: false, shared_link: { url: pathOrLink } }
    : { path: pathOrLink, recursive: true }

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

interface ClarkQuestion {
  id: string
  question: string
  context: string
  type: "text" | "number" | "choice"
  choices?: string[]
}

interface ClarkQuestionOutput {
  scope_summary: string
  questions: ClarkQuestion[]
  assumptions: string[]
  line_items: { description: string; man_days: number | null; total: number }[]
  subtrades: { phase_code: string; activity: string; qty: number; unit: string; unit_cost: number }[]
  total_man_days: number
  crew_size: number
  crew_days: number
  blended_rate: number
  preliminary_data: {
    line_items: { description: string; quantity: number; unit: string; notes: string }[]
  }
}

class ClarkParseError extends Error {
  raw: string

  constructor(message: string, raw: string) {
    super(message)
    this.name = "ClarkParseError"
    this.raw = raw
  }
}

function parseClarkResponse(text: string): ClarkQuestionOutput {
  const withoutCodeFences = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()

  const firstBrace = withoutCodeFences.indexOf("{")
  const lastBrace = withoutCodeFences.lastIndexOf("}")

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new ClarkParseError("Clark returned invalid JSON", text)
  }

  const extracted = withoutCodeFences.slice(firstBrace, lastBrace + 1)

  try {
    return JSON.parse(extracted) as ClarkQuestionOutput
  } catch {
    throw new ClarkParseError("Clark could not parse response", text)
  }
}

async function analyzeWithClaude(
  docPayloads: { filename: string; mediaType: string; base64: string }[],
  bidName: string,
  extraNote: string
): Promise<ClarkQuestionOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const knowledge = await loadClarkKnowledge()

  const contentBlocks: any[] = []

  contentBlocks.push({
    type: "text",
    text: [
      `You are Clark, an expert construction estimator's assistant for West Crow Contracting.`,
      knowledge ? `Clark system context (West Crow methodology):\n${knowledge}` : null,
      `Analyze these demolition/construction documents for bid: "${bidName}".`,
      extraNote ? `JP's note: ${extraNote}` : null,
      ``,
      `Analyze these demolition/construction documents. Extract what you can measure or confirm directly. For anything you cannot determine with confidence (floor finish type, partition wall LF, ceiling split ACT vs GWB, etc.), add it to a questions array.`,
      `Use the DeHyl formula for pricing: man_days = units / production_rate, labour = man_days × $296/day, total = labour × 1.42 (OH 12% + profit 30%).`,
      `Also calculate subtrade quantities. Estimate waste by stream weight (e.g. flooring 2 lbs/SF, drywall 1 lb/SF, ceilings ~0.75 lbs/SF, masonry/concrete heavier).`,
      `Waste-bin formula: total_weight_lbs = sum(all stream weights); total_MT = total_weight_lbs / 2204.6; bins = ceil(total_MT / 6).`,
      `Set Waste Disposal 40YD Bins qty=bins and unit_cost=2800 (each 40YD bin holds 6 metric tons).`,
      `Set Pickup Truck qty=total_man_days, unit=/day, unit_cost=90.`,
      `Set Small Tools / Shop Consumables qty=total_man_days * 8, unit=/day, unit_cost=1.81.`,
      `Set Project Manager Oversight qty=crew_days / 2, unit=EA, unit_cost=95.`,
      `Set Waste Transport / Haul-out qty=1, unit=LS, unit_cost=450.`,
      `Use crew_size=4, crew_days=total_man_days/crew_size, blended_rate=300.`,
      `If quantities are unknown, use 0 and explicitly flag the gap in assumptions.`,
      `Return ONLY valid JSON with shape:`,
      `{`,
      `  "scope_summary": "string",`,
      `  "questions": [{`,
      `    "id": "string",`,
      `    "question": "string",`,
      `    "context": "string",`,
      `    "type": "text|number|choice",`,
      `    "choices": ["string"]`,
      `  }],`,
      `  "assumptions": ["assumption 1"],`,
      `  "line_items": [{"description": "Flooring (9500 SF)", "man_days": 33.55, "total": 16611}],`,
      `  "subtrades": [`,
      `    {"phase_code": "057050", "activity": "Waste Disposal 40YD Bins", "qty": 0, "unit": "LS", "unit_cost": 2800},`,
      `    {"phase_code": "051030", "activity": "Pickup Truck", "qty": 0, "unit": "/day", "unit_cost": 90},`,
      `    {"phase_code": "057050", "activity": "Small Tools / Shop Consumables", "qty": 0, "unit": "/day", "unit_cost": 1.81},`,
      `    {"phase_code": "056400", "activity": "Project Manager Oversight", "qty": 0, "unit": "EA", "unit_cost": 95},`,
      `    {"phase_code": "057050", "activity": "Waste Transport / Haul-out", "qty": 1, "unit": "LS", "unit_cost": 450}`,
      `  ],`,
      `  "total_man_days": 0,`,
      `  "crew_size": 4,`,
      `  "crew_days": 0,`,
      `  "blended_rate": 300,`,
      `  "preliminary_data": {`,
      `    "line_items": [{"description": "...", "quantity": 0, "unit": "SF|EA|LF|LS|CY|day", "notes": "..."}]`,
      `  }`,
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
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const result = await response.json()
  const text = result.content?.[0]?.text ?? "{}"
  return parseClarkResponse(text)
}

async function loadClarkKnowledge(): Promise<string> {
  const repoPath = path.join(process.cwd(), "skills/clark/CLARK_WESTCROW.md")
  const homePath = path.join(process.env.HOME ?? "", ".openclaw/workspace/skills/clark/CLARK_WESTCROW.md")
  const fallbackPath = path.join(process.cwd(), "lib/clark-knowledge.md")

  try {
    return await fs.readFile(repoPath, "utf-8")
  } catch {}

  try {
    const homeContent = await fs.readFile(homePath, "utf-8")
    await fs.mkdir(path.dirname(fallbackPath), { recursive: true })
    await fs.writeFile(fallbackPath, homeContent, "utf-8")
    return homeContent
  } catch {}

  try {
    return await fs.readFile(fallbackPath, "utf-8")
  } catch {
    return ""
  }
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
    if (doc.url && doc.url.startsWith("/")) {
      try {
        const subEntries = await listFolderRecursive(doc.url, token)
        for (const entry of subEntries) {
          if (entry[".tag"] === "file" && isSupported(entry.name)) {
            filesToAnalyze.push({ filename: entry.name, dropboxPath: entry.id ?? entry.path_display })
          }
        }
      } catch {
        if (isSupported(doc.name)) {
          filesToAnalyze.push({ filename: doc.name, dropboxPath: doc.url })
        }
      }
    }
  }

  // Fallback: list top-level folder
  if (filesToAnalyze.length === 0 && folder && (folder.startsWith("/") || isDropboxSharedLink(folder))) {
    try {
      const entries = await listFolderRecursive(folder, token)
      for (const entry of entries) {
        if (entry[".tag"] === "file" && isSupported(entry.name)) {
          filesToAnalyze.push({ filename: entry.name, dropboxPath: entry.id ?? entry.path_display })
        }
      }
    } catch {}
  }

  // Download and encode files (max 10, 20MB each)
  const docPayloads: { filename: string; mediaType: string; base64: string }[] = []
  const errors: string[] = []

  for (const file of filesToAnalyze.slice(0, 10)) {
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
  let clarkOutput: ClarkQuestionOutput
  if (docPayloads.length > 0) {
    try {
      clarkOutput = await analyzeWithClaude(docPayloads, bidName || bid.project_name, extraNote || "")
    } catch (e: any) {
      if (e instanceof ClarkParseError) {
        console.error("[send-to-clark] Failed to parse Claude response", {
          bidId: id,
          message: e.message,
          raw: e.raw,
        })

        await updateBid(id, {
          status: "active",
          estimate_data: JSON.stringify({
            ...existingEstimate,
            meta: {
              ...(existingEstimate.meta ?? {}),
              status: "active",
              clark_notes: "⚠️ Clark could not parse response",
              prepared_by: "Clark",
              prepared_at: new Date().toISOString(),
              assumptions: existingEstimate.meta?.assumptions ?? [],
            },
          }),
        })

        return NextResponse.json(
          { error: "Clark could not parse response", raw: e.raw.slice(0, 500) },
          { status: 502 }
        )
      }

      await updateBid(id, {
        estimate_data: JSON.stringify({
          ...existingEstimate,
          meta: {
            ...(existingEstimate.meta ?? {}),
            status: "clark_questions",
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
      questions: [],
      assumptions: ["No documents found in linked Dropbox folder — manual entry required"],
      line_items: [],
      subtrades: [],
      total_man_days: 0,
      crew_size: 4,
      crew_days: 0,
      blended_rate: 300,
      preliminary_data: {
        line_items: [],
      },
    }
  }

  const meta: EstimateMeta = {
    status:            "clark_questions",
    clark_notes:       clarkOutput.scope_summary,
    prepared_by:       "Clark",
    prepared_at:       new Date().toISOString(),
    assumptions: [],
  }

  const estimateData = {
    config:      DEFAULT_CONFIG,
    sections: DEFAULT_SECTIONS,
    subtrades:   DEFAULT_SUBTRADES,
    meta,
    clark_questions: clarkOutput,
    grand_total: 0,
  }

  // Save to Supabase
  await updateBid(id, {
    estimate_data: JSON.stringify(estimateData),
    status:        "clark_questions",
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
        clark_questions: clarkOutput,
        message:   `📐 Clark completed analysis for **${bidName || bid.project_name}**\n• ${clarkOutput.questions?.length ?? 0} clarifying questions generated\n• Review: ${process.env.NEXTAUTH_URL || "https://west-crow-dashboard.vercel.app"}/bids/${id}/estimate`,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({
    ok:            true,
    docs_analyzed: docPayloads.length,
    questions:     clarkOutput.questions?.length ?? 0,
    errors,
  })
}

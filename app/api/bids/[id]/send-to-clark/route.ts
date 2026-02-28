import { promises as fs } from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid, addBidTimeline } from "@/lib/sheets"

export const dynamic = "force-dynamic"
export const maxDuration = 120

type Ctx = { params: Promise<{ id: string }> }

type ClarkQuestionType = "text" | "number" | "choice"

interface ClarkQuestion {
  id: string
  question: string
  context: string
  type: ClarkQuestionType
  choices?: string[]
}

interface ClarkQuestionOutput {
  scope_summary: string
  questions: ClarkQuestion[]
  preliminary_data: {
    line_items: { description: string; quantity: number; unit: string; notes: string }[]
    assumptions: string[]
  }
}

async function getDropboxToken(): Promise<string> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim()
  const appKey = process.env.DROPBOX_APP_KEY?.trim()
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim()

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

const SUPPORTED_EXTS = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".csv"]
const MAX_FILE_SIZE = 20 * 1024 * 1024

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

async function loadClarkKnowledgeContext(): Promise<string> {
  const repoPath = path.join(process.cwd(), "skills", "clark", "CLARK_WESTCROW.md")
  const fallbackPath = path.join(process.env.HOME ?? "", ".openclaw", "workspace", "skills", "clark", "CLARK_WESTCROW.md")
  const localCopyPath = path.join(process.cwd(), "lib", "clark-knowledge.md")

  try {
    return await fs.readFile(repoPath, "utf-8")
  } catch {}

  if (fallbackPath) {
    try {
      const content = await fs.readFile(fallbackPath, "utf-8")
      await fs.writeFile(localCopyPath, content)
      return content
    } catch {}
  }

  try {
    return await fs.readFile(localCopyPath, "utf-8")
  } catch {
    return ""
  }
}

async function analyzeWithClaude(
  docPayloads: { filename: string; mediaType: string; base64: string }[],
  bidName: string,
  extraNote: string
): Promise<ClarkQuestionOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const knowledgeContext = await loadClarkKnowledgeContext()

  const contentBlocks: any[] = [{
    type: "text",
    text: [
      `Analyze these demolition/construction documents. Extract what you can measure or confirm directly. For anything you cannot determine with confidence (floor finish type, partition wall LF, ceiling split ACT vs GWB, etc.), add it to a questions array.`,
      `Bid: "${bidName}".`,
      extraNote ? `JP's note: ${extraNote}` : null,
      `Return JSON: { scope_summary: string, questions: [{ id: string, question: string, context: string, type: 'text'|'number'|'choice', choices?: string[] }], preliminary_data: { line_items: [...], assumptions: [...] } }`,
      `Return ONLY valid JSON and nothing else.`,
    ].filter(Boolean).join("\n"),
  }]

  for (const doc of docPayloads) {
    const isImage = doc.mediaType.startsWith("image/")
    const isPdf = doc.mediaType === "application/pdf"
    const isText = doc.mediaType.startsWith("text/")

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
      system: knowledgeContext || undefined,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const result = await response.json()
  const text = result.content?.[0]?.text ?? "{}"
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Clark returned invalid JSON")

  return JSON.parse(jsonMatch[0]) as ClarkQuestionOutput
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const { bidName, dropboxFolder, documents, extraNote } = body

  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const folder: string = dropboxFolder || bid.dropbox_folder || ""
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
      },
    }),
  })

  let token: string
  try {
    token = await getDropboxToken()
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

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
        if (isSupported(doc.name)) filesToAnalyze.push({ filename: doc.name, dropboxPath: doc.url })
      }
    }
  }

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
        filename: file.filename,
        mediaType: getMediaType(file.filename),
        base64: Buffer.from(buffer).toString("base64"),
      })
    } catch (e: any) {
      errors.push(`Error with ${file.filename}: ${e.message}`)
    }
  }

  await addBidTimeline(id, {
    stage: "estimating",
    note: `Clark: ${docPayloads.length} doc(s) analyzed${extraNote ? " — JP note: " + extraNote : ""}${errors.length > 0 ? ` (${errors.length} skipped)` : ""}`,
    by: "JP",
  })

  let clarkOutput: ClarkQuestionOutput
  if (docPayloads.length > 0) {
    try {
      clarkOutput = await analyzeWithClaude(docPayloads, bidName || bid.project_name, extraNote || "")
    } catch (e: any) {
      await updateBid(id, {
        estimate_data: JSON.stringify({
          ...existingEstimate,
          meta: {
            ...(existingEstimate.meta ?? {}),
            status: "clark_questions",
            clark_notes: `⚠️ Clark AI error: ${e.message}`,
            prepared_by: "Clark",
            prepared_at: new Date().toISOString(),
          },
          clark_questions_payload: {
            scope_summary: "Clark hit an AI error and needs manual input.",
            questions: [{ id: "fallback-1", question: "Please provide key quantities manually so Clark can proceed.", context: "No model output generated.", type: "text" }],
            preliminary_data: { line_items: [], assumptions: [] },
          },
        }),
        status: "clark_questions",
      })
      return NextResponse.json({ ok: true, warning: e.message, docs: 0 })
    }
  } else {
    clarkOutput = {
      scope_summary: "No documents available for analysis. Please attach bid documents and provide the missing scope details.",
      questions: [{
        id: "missing-docs",
        question: "Please confirm the core scope and quantities (flooring SF, partitions LF, ceilings SF split, waste bins, and schedule).",
        context: "Dropbox documents were not found or unsupported.",
        type: "text",
      }],
      preliminary_data: {
        line_items: [],
        assumptions: ["No documents found in linked Dropbox folder — manual clarification required"],
      },
    }
  }

  const estimateData = {
    ...(existingEstimate ?? {}),
    meta: {
      ...(existingEstimate.meta ?? {}),
      status: "clark_questions",
      clark_notes: clarkOutput.scope_summary,
      prepared_by: "Clark",
      prepared_at: new Date().toISOString(),
      clark_triggered_at: existingEstimate.meta?.clark_triggered_at ?? new Date().toISOString(),
    },
    clark_questions_payload: clarkOutput,
  }

  await updateBid(id, {
    estimate_data: JSON.stringify(estimateData),
    status: "clark_questions",
  })

  return NextResponse.json({
    ok: true,
    docs_analyzed: docPayloads.length,
    questions: clarkOutput.questions?.length ?? 0,
    errors,
  })
}

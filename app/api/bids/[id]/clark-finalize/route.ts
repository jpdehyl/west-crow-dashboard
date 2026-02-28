import { promises as fs } from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid } from "@/lib/sheets"
import { DEFAULT_CONFIG, DEFAULT_SECTIONS, DEFAULT_SUBTRADES } from "@/lib/estimate-data"
import type { EstimateMeta, Section } from "@/lib/estimate-data"

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

interface ClarkQuestionPayload {
  scope_summary: string
  questions: ClarkQuestion[]
  preliminary_data: {
    line_items: { description: string; quantity: number; unit: string; notes: string }[]
    assumptions: string[]
  }
}

interface ClarkFinalOutput {
  scope_summary: string
  line_items: { description: string; quantity: number; unit: string; notes: string }[]
  assumptions: string[]
  exclusions: string[]
  hazmat_present: boolean
  confidence: number
}

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

function mapLineItemsToSections(lineItems: ClarkFinalOutput["line_items"], defaultSections: Section[]): Section[] {
  const sections = JSON.parse(JSON.stringify(defaultSections)) as Section[]

  for (const item of lineItems) {
    const desc = item.description.toLowerCase()
    const match = KEYWORD_MAP.find(m => m.keywords.some(k => desc.includes(k)))
    if (!match) continue

    const sec = sections.find(s => s.id === match.sectionId)
    if (!sec) continue

    const targetItem = match.itemId
      ? sec.items.find(i => i.id === match.itemId)
      : sec.items[0]

    if (!targetItem) continue

    if (item.quantity > 0) targetItem.units = item.quantity
    targetItem.active = true
    if (item.notes) targetItem.notes = item.notes
    sec.expanded = true
  }

  return sections
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

async function finalizeWithClaude(
  bidName: string,
  payload: ClarkQuestionPayload,
  answers: { id: string; answer: string }[]
): Promise<ClarkFinalOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  const knowledgeContext = await loadClarkKnowledgeContext()
  const answerMap = new Map(answers.map(a => [a.id, a.answer]))

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: knowledgeContext || undefined,
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: [
            `You are finalizing a West Crow demolition/construction estimate for bid: "${bidName}".`,
            `Use the prior scope summary, preliminary line items, and answered clarifying questions to generate final line items with real quantities.`,
            `Return ONLY valid JSON with this shape:`,
            `{ "scope_summary": string, "line_items": [{"description": string, "quantity": number, "unit": "SF|EA|LF|LS|CY|day", "notes": string}], "assumptions": string[], "exclusions": string[], "hazmat_present": boolean, "confidence": number }`,
            `Context: ${JSON.stringify(payload)}`,
            `Answers: ${JSON.stringify(payload.questions.map(q => ({ ...q, answer: answerMap.get(q.id) ?? "" })) )}`,
          ].join("\n"),
        }],
      }],
    }),
  })

  if (!response.ok) throw new Error(await response.text())

  const result = await response.json()
  const text = result.content?.[0]?.text ?? "{}"
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Clark returned invalid JSON")

  return JSON.parse(jsonMatch[0]) as ClarkFinalOutput
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const answers = Array.isArray(body?.answers) ? body.answers : []

  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existingEstimate = bid.estimate_data
    ? (() => { try { return JSON.parse(bid.estimate_data) } catch { return {} } })()
    : {}

  const payload = existingEstimate?.clark_questions_payload as ClarkQuestionPayload | undefined
  if (!payload) return NextResponse.json({ error: "No Clark question payload found" }, { status: 400 })

  const clarkOutput = await finalizeWithClaude(bid.project_name, payload, answers)

  const sections = mapLineItemsToSections(clarkOutput.line_items ?? [], DEFAULT_SECTIONS)
  const assumptions = [
    ...(clarkOutput.assumptions ?? []).map((text, i) => ({
      id: `clark-a-${i}`,
      severity: "warn" as const,
      source: "Clark AI analysis",
      text,
      resolved: false,
    })),
    ...(clarkOutput.exclusions ?? []).map((text, i) => ({
      id: `clark-e-${i}`,
      severity: "info" as const,
      source: "Clark exclusions",
      text: `EXCLUDED: ${text}`,
      resolved: false,
    })),
    ...(clarkOutput.hazmat_present ? [{
      id: "clark-hazmat",
      severity: "flag" as const,
      source: "Clark AI analysis",
      text: "Hazmat materials detected — confirm scope and quantities with certified report",
      resolved: false,
    }] : []),
  ]

  const meta: EstimateMeta & { clark_confidence?: number } = {
    status: "clark_draft",
    clark_notes: clarkOutput.scope_summary,
    prepared_by: "Clark",
    prepared_at: new Date().toISOString(),
    assumptions,
    clark_confidence: clarkOutput.confidence,
  }

  const estimateData = {
    config: DEFAULT_CONFIG,
    sections,
    subtrades: DEFAULT_SUBTRADES,
    meta,
    clark_draft: clarkOutput,
    clark_questions_payload: payload,
    clark_answers: answers,
    grand_total: 0,
  }

  await updateBid(id, {
    estimate_data: JSON.stringify(estimateData),
    status: "clark_draft",
  })

  return NextResponse.json({ ok: true, line_items: clarkOutput.line_items?.length ?? 0 })
}

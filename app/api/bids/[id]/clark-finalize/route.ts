import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid } from "@/lib/sheets"
import { DEFAULT_SECTIONS } from "@/lib/estimate-data"
import type { Section, EstimateMeta } from "@/lib/estimate-data"
import { createClarkEstimateSheet } from "@/lib/google-estimate-sheet"

export const dynamic = "force-dynamic"
export const maxDuration = 120

type Ctx = { params: Promise<{ id: string }> }

type ClarkQuestion = {
  id: string
  question: string
  context: string
  type: "text" | "number" | "choice"
  choices?: string[]
}

type ClarkTakeoffItem = { description: string; quantity: number; unit: string; notes: string }
type ClarkPricedItem = { description: string; man_days: number | null; total: number }

type ClarkOutput = {
  scope_summary: string
  takeoff_items: ClarkTakeoffItem[]
  line_items: ClarkPricedItem[]
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

function mapLineItemsToSections(lineItems: ClarkTakeoffItem[], defaultSections: Section[]): Section[] {
  const sections = JSON.parse(JSON.stringify(defaultSections)) as Section[]
  for (const item of lineItems) {
    const desc = item.description.toLowerCase()
    const match = KEYWORD_MAP.find(m => m.keywords.some(k => desc.includes(k)))
    if (!match) continue

    const sec = sections.find(s => s.id === match.sectionId)
    if (!sec) continue

    const targetItem = match.itemId ? sec.items.find(i => i.id === match.itemId) : sec.items[0]
    if (!targetItem) continue

    if (item.quantity > 0) targetItem.units = item.quantity
    targetItem.active = true
    if (item.notes) targetItem.notes = item.notes
    sec.expanded = true
  }
  return sections
}

async function finalizeWithClaude(
  bidName: string,
  scopeSummary: string,
  preliminaryData: any,
  questions: ClarkQuestion[],
  answers: { id: string; answer: string }[]
): Promise<ClarkOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

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
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: [
            `You are Clark, an expert construction estimator's assistant for West Crow Contracting.`,
            `Use the answered clarifying questions to produce final takeoff quantities and a priced summary.`,
            `Use DeHyl math: man_days = units / production_rate, labour = man_days × 296, total = labour × 1.42.`,
            `If quantities are unknown, set quantity to 0 and add a clear assumption.`,
            `Return ONLY valid JSON with shape:`,
            `{`,
            `  "scope_summary": "Brief scope description",`,
            `  "takeoff_items": [{"description": "...", "quantity": 0, "unit": "SF|EA|LF|LS|CY|day", "notes": "..."}],`,
            `  "line_items": [{"description": "Flooring (9500 SF)", "man_days": 33.55, "total": 16611}],`,
            `  "assumptions": ["assumption 1", ...],`,
            `  "exclusions": ["exclusion 1", ...],`,
            `  "hazmat_present": true|false,`,
            `  "confidence": 0.0-1.0`,
            `}`,
            `Context:`,
            JSON.stringify({ bidName, scopeSummary, preliminaryData, questions, answers }),
          ].join("\n"),
        }],
      }],
    }),
  })

  if (!response.ok) throw new Error(`Claude API error: ${await response.text()}`)

  const result = await response.json()
  const text = result.content?.[0]?.text ?? "{}"
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Clark returned invalid JSON")

  return JSON.parse(jsonMatch[0]) as ClarkOutput
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const { answers } = await req.json()

  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const estimateData = bid.estimate_data ? JSON.parse(bid.estimate_data) : null
  const questionData = estimateData?.clark_questions

  if (!questionData) {
    return NextResponse.json({ error: "No Clark questions found" }, { status: 400 })
  }

  const clarkOutput = await finalizeWithClaude(
    bid.project_name,
    questionData.scope_summary,
    questionData.preliminary_data,
    questionData.questions ?? [],
    answers ?? []
  )

  const takeoffItems = clarkOutput.takeoff_items ?? questionData.preliminary_data?.line_items ?? []
  const sections = mapLineItemsToSections(takeoffItems, DEFAULT_SECTIONS)
  const assumptions = [
    ...(clarkOutput.assumptions ?? []).map((text: string, i: number) => ({
      id: `clark-a-${i}`,
      severity: "warn" as const,
      source: "Clark AI analysis",
      text,
      resolved: false,
    })),
  ]

  const meta: EstimateMeta & { clark_confidence?: number } = {
    status: "clark_draft",
    clark_notes: clarkOutput.scope_summary,
    prepared_by: "Clark",
    prepared_at: new Date().toISOString(),
    assumptions,
    clark_confidence: clarkOutput.confidence,
  }

  const sheetResult = await createClarkEstimateSheet(bid.project_name, clarkOutput.line_items ?? []).catch(() => null)

  await updateBid(id, {
    estimate_data: JSON.stringify({
      ...estimateData,
      sections,
      meta,
      clark_draft: { ...clarkOutput, takeoff_items: takeoffItems },
      clark_answers: answers ?? [],
    }),
    ...(sheetResult?.spreadsheetUrl ? { estimate_sheet_url: sheetResult.spreadsheetUrl } : {}),
    status: "clark_draft",
  })

  return NextResponse.json({
    ok: true,
    line_items: clarkOutput.line_items?.length ?? 0,
    estimate_sheet_url: sheetResult?.spreadsheetUrl ?? null,
  })
}

import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid } from "@/lib/sheets"
import { DEFAULT_SECTIONS } from "@/lib/estimate-data"
import type { Section, EstimateMeta } from "@/lib/estimate-data"
import { createEstimateSheet } from "@/lib/google-estimate-sheet"

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

type PricedLineItem = {
  description: string
  man_days: number | null
  total: number
}

type ClarkOutput = {
  scope_summary: string
  line_items: PricedLineItem[]
  assumptions: string[]
  confidence: number
}

const KEYWORD_MAP: { keywords: string[]; sectionId: string; itemId?: string }[] = [
  { keywords: ["vft", "vinyl", "floor tile", "mastic", "floor covering", "vct"], sectionId: "vft_mastic" },
  { keywords: ["drywall", "plaster", "ceiling tile", "t-bar", "t bar", "suspended ceiling", "lay-in", "act ceiling"], sectionId: "drywall_ceiling" },
  { keywords: ["acm pipe", "pipe insulation", "boiler", "hvac insulation", "mechanical insulation"], sectionId: "acm_pipe" },
  { keywords: ["spray", "tsac", "fireproofing", "transite"], sectionId: "spray_tsac" },
  { keywords: ["concrete", "slab", "topping", "grinding", "shot blast", "scarify"], sectionId: "concrete_topping" },
  { keywords: ["brick", "masonry", "block", "cmu"], sectionId: "masonry" },
  { keywords: ["structural", "heavy demo", "selective demo", "partition", "wall"], sectionId: "demo_structural" },
  { keywords: ["mobilization", "mob", "setup", "site setup"], sectionId: "mob", itemId: "mob" },
  { keywords: ["demobilization", "demob", "cleanup"], sectionId: "mob", itemId: "demob" },
  { keywords: ["debris", "waste", "hauling", "disposal", "bin", "truck"], sectionId: "waste" },
]

function extractQuantityFromDescription(description: string): number {
  const match = description.match(/\(([\d,.]+)\s*(SF|EA|LF|LS|CY|DAY)\)/i)
  if (!match) return 0
  return Number(match[1].replaceAll(",", "")) || 0
}

function mapLineItemsToSections(lineItems: ClarkOutput["line_items"], defaultSections: Section[]): Section[] {
  const sections = JSON.parse(JSON.stringify(defaultSections)) as Section[]
  for (const item of lineItems) {
    const desc = item.description.toLowerCase()
    const match = KEYWORD_MAP.find(m => m.keywords.some(k => desc.includes(k)))
    if (!match) continue

    const sec = sections.find(s => s.id === match.sectionId)
    if (!sec) continue

    const targetItem = match.itemId ? sec.items.find(i => i.id === match.itemId) : sec.items[0]
    if (!targetItem) continue

    const quantity = extractQuantityFromDescription(item.description)
    if (quantity > 0) targetItem.units = quantity
    targetItem.active = true
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
            `Use the answered clarifying questions to produce final priced line items.`,
            `Use DeHyl pricing formula exactly: man_days = units / production_rate, labour = man_days × 296, total = labour × 1.42.`,
            `If quantities are unknown, use zero and add explicit assumption flags.`,
            `Return ONLY valid JSON with shape:`,
            `{`,
            `  "scope_summary": "Brief scope description",`,
            `  "line_items": [`,
            `    {"description": "Flooring (9500 SF)", "man_days": 33.55, "total": 16611},`,
            `    {"description": "Labour Scope Total", "man_days": 63.5, "total": 31288},`,
            `    {"description": "Subtrades (bins + dump, 20% markup)", "man_days": null, "total": 18000},`,
            `    {"description": "TOTAL RECOMMENDED BID", "man_days": null, "total": 49288}`,
            `  ],`,
            `  "assumptions": ["assumption 1", ...],`,
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
    questionData.preliminary_data ?? { assumptions: questionData.assumptions, line_items: questionData.line_items },
    questionData.questions ?? [],
    answers ?? []
  )

  const sections = mapLineItemsToSections(clarkOutput.line_items, DEFAULT_SECTIONS)
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

  let estimateSheetUrl: string | null = null
  try {
    estimateSheetUrl = await createEstimateSheet(bid.project_name, clarkOutput.line_items)
  } catch {
    estimateSheetUrl = null
  }

  await updateBid(id, {
    estimate_data: JSON.stringify({
      ...estimateData,
      sections,
      meta,
      clark_draft: clarkOutput,
      clark_answers: answers ?? [],
    }),
    ...(estimateSheetUrl ? { estimate_sheet_url: estimateSheetUrl } : {}),
    status: "clark_draft",
  })

  return NextResponse.json({ ok: true, line_items: clarkOutput.line_items?.length ?? 0, estimate_sheet_url: estimateSheetUrl })
}

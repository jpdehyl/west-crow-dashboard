import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid } from "@/lib/sheets"
import { generateEstimateNumber, deriveGcNameFromProject } from "@/lib/estimates"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const data = bid.estimate_data ? JSON.parse(bid.estimate_data) : null
    return NextResponse.json({ ok: true, data, estimate_number: bid.estimate_number ?? null })
  } catch {
    return NextResponse.json({ ok: true, data: null, estimate_number: bid.estimate_number ?? null })
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()

  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Generate estimate number if not already assigned
  let estimateNumber: string | undefined = bid.estimate_number
  let gcCode: string | undefined = bid.gc_code
  let gcNameStored: string | undefined = bid.gc_name

  if (!estimateNumber) {
    // Prefer gc_name from body/bid, fall back to parsing project name
    const gcNameRaw =
      body.gc_name ||
      bid.gc_name ||
      deriveGcNameFromProject(bid.project_name || "") ||
      bid.client

    if (gcNameRaw) {
      try {
        const result = await generateEstimateNumber(gcNameRaw)
        estimateNumber = result.estimateNumber
        gcCode = result.gcCode
        gcNameStored = result.gcName
      } catch (e) {
        console.error("Failed to generate estimate number:", e)
      }
    }
  }

  await updateBid(id, {
    estimate_data: JSON.stringify(body),
    bid_value: body.grand_total ? Math.round(body.grand_total) : undefined,
    ...(estimateNumber ? { estimate_number: estimateNumber, gc_code: gcCode, gc_name: gcNameStored } : {}),
  })

  return NextResponse.json({ ok: true, estimate_number: estimateNumber ?? null, gc_code: gcCode ?? null })
}

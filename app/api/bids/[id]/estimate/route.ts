import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid } from "@/lib/sheets"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const data = bid.estimate_data ? JSON.parse(bid.estimate_data) : null
    return NextResponse.json({ ok: true, data })
  } catch {
    return NextResponse.json({ ok: true, data: null })
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  // Store as JSON string in estimate_data column
  await updateBid(id, {
    estimate_data: JSON.stringify(body),
    bid_value: body.grand_total ? Math.round(body.grand_total) : undefined,
  })
  return NextResponse.json({ ok: true })
}

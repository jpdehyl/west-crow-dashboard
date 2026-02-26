import { NextResponse } from "next/server"
import { getBid, createBid } from "@/lib/sheets"

export const dynamic = "force-dynamic"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const original = await getBid(id) as any
    if (!original) return NextResponse.json({ error: "Bid not found" }, { status: 404 })

    const clone = await createBid({
      project_name: `${original.project_name} (Copy)`,
      client:       original.client,
      client_id:    original.client_id || "",
      bid_value:    original.bid_value,
      deadline:     original.deadline,
      margin_pct:   original.margin_pct || "",
      estimator:    original.estimator || "JP",
      notes:        original.notes || "",
      source:       `Cloned from ${id}`,
    })

    return NextResponse.json(clone)
  } catch (err) {
    console.error("Clone error:", err)
    return NextResponse.json({ error: "Clone failed" }, { status: 500 })
  }
}

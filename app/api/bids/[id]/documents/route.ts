import { NextResponse } from "next/server"
import { addBidDocument } from "@/lib/sheets"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, url, type } = body
    if (!name || !url) return NextResponse.json({ error: "name and url required" }, { status: 400 })

    const doc = await addBidDocument(id, {
      bid_id: id,
      name:   name.trim(),
      url:    url.trim(),
      type:   type || "bid_docs",
    })

    return NextResponse.json(doc ?? { ok: true })
  } catch (err) {
    console.error("addDocument error:", err)
    return NextResponse.json({ error: "Failed to add document" }, { status: 500 })
  }
}

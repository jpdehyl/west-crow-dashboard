import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

type LineItem = {
  description: string
  man_days: number | null
  total: number
}

type SheetUpdatePayload = {
  bidId: string
  lineItems: LineItem[]
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-webhook-secret")
  const expectedSecret = process.env.SHEET_WEBHOOK_SECRET

  if (!expectedSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse and validate payload
  let payload: SheetUpdatePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { bidId, lineItems } = payload

  if (!bidId || !Array.isArray(lineItems)) {
    return NextResponse.json({ error: "Missing bidId or lineItems" }, { status: 400 })
  }

  // Fetch current bid from Supabase
  const { data: bid, error: fetchError } = await supabase
    .from("bids")
    .select("estimate_data")
    .eq("id", bidId)
    .single()

  if (fetchError || !bid) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 })
  }

  // Parse estimate_data and merge line items into clark_draft
  let estimateData: any = {}
  try {
    estimateData = bid.estimate_data ? JSON.parse(bid.estimate_data) : {}
  } catch {
    return NextResponse.json({ error: "Failed to parse estimate_data" }, { status: 500 })
  }

  const clarkDraft = estimateData.clark_draft ?? {}
  estimateData.clark_draft = {
    ...clarkDraft,
    line_items: lineItems,
    sheet_synced_at: new Date().toISOString(),
  }

  // Write back to Supabase
  const { error: updateError } = await supabase
    .from("bids")
    .update({ estimate_data: JSON.stringify(estimateData) })
    .eq("id", bidId)

  if (updateError) {
    return NextResponse.json({ error: "Failed to update bid" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

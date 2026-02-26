import { NextRequest, NextResponse } from "next/server"
import { getBid, updateBid, addBidTimeline } from "@/lib/sheets"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const { bidName, dropboxFolder, documents, extraNote } = body

  const bid = await getBid(id) as any
  if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // 1. Save Dropbox folder + set estimate status to clark_working
  const existingEstimate = bid.estimate_data ? (() => { try { return JSON.parse(bid.estimate_data) } catch { return {} } })() : {}
  const updatedEstimate = {
    ...existingEstimate,
    meta: {
      ...(existingEstimate.meta ?? {}),
      status: "clark_working",
      clark_triggered_at: new Date().toISOString(),
      prepared_by: "Clark",
    },
  }
  await updateBid(id, {
    ...(dropboxFolder ? { dropbox_folder: dropboxFolder } : {}),
    estimate_data: JSON.stringify(updatedEstimate),
  })

  // 2. Add timeline entry
  await addBidTimeline(id, {
    stage: "estimating",
    note: `Clark estimate requested — ${documents.length} doc(s) attached${dropboxFolder ? ", Dropbox folder linked" : ""}${extraNote ? ". JP note: " + extraNote : ""}`,
    by: "JP",
  })

  // 3. Post to #clark via OpenClaw internal webhook (if configured)
  const clarkWebhook = process.env.CLARK_WEBHOOK_URL
  if (clarkWebhook) {
    const docSummary = documents.map((d: any) => `• ${d.name} (${d.type}): ${d.url}`).join("\n")
    const payload = {
      bid_id:         id,
      bid_name:       bidName,
      dropbox_folder: dropboxFolder || null,
      documents,
      extra_note:     extraNote || null,
      message: [
        `📐 **Clark — New Estimate Request**`,
        `**Bid:** ${bidName} (ID: \`${id}\`)`,
        dropboxFolder ? `**Dropbox folder:** ${dropboxFolder}` : null,
        `**Documents (${documents.length}):**`,
        docSummary || "— none attached yet",
        extraNote ? `**JP's note:** ${extraNote}` : null,
        ``,
        `Start estimate → POST to \`/api/bids/${id}/estimate\``,
        `Review the estimate at: ${process.env.NEXTAUTH_URL || "https://west-crow-dashboard.vercel.app"}/bids/${id}/estimate`,
      ].filter(Boolean).join("\n"),
    }
    await fetch(clarkWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {})  // non-fatal
  }

  return NextResponse.json({ ok: true })
}

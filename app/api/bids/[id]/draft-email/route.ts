import { NextRequest, NextResponse } from "next/server"
import { getBid } from "@/lib/sheets"
import { buildProposalData } from "@/lib/proposal-pdf"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Ctx = { params: Promise<{ id: string }> }

async function getGmailAccessToken(): Promise<string> {
  const clientId     = process.env.GMAIL_CLIENT_ID!
  const clientSecret = process.env.GMAIL_CLIENT_SECRET!
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN!

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Gmail token refresh failed: ${res.status} ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.access_token
}

async function generateEmailBody(bid: any, estimateData: any, proposalData: any): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const lineItemsSummary = proposalData.lineItems
    .slice(0, 8)
    .map((i: any) => `- ${i.description} (${i.qty_unit})`)
    .join("\n")

  const assumptions = proposalData.assumptions.slice(0, 5).join("\n- ")
  const hazmat = estimateData?.clark_draft?.hazmat_present || estimateData?.meta?.hazmat_present
  const total = new Intl.NumberFormat("en-CA", {
    style: "currency", currency: "CAD", minimumFractionDigits: 2,
  }).format(proposalData.grandTotal)

  const gcName = bid.gc_name || bid.client || "Team"

  const prompt = `Write a professional email from West Crow Contracting Ltd. to a general contractor submitting a demolition/abatement quote.

Project: ${bid.project_name}
Address: ${bid.address || bid.project_name}
GC/Client: ${gcName}
Quote total (excl. GST): ${total}
Estimate #: ${bid.estimate_number || "TBD"}
Hazmat present: ${hazmat ? "Yes — hazmat abatement included" : "No"}

Scope items:
${lineItemsSummary}

Key assumptions:
${assumptions ? `- ${assumptions}` : "Standard West Crow assumptions apply — see attached T&C"}

Write in GC language — direct, professional, no fluff. Structure:
1. Opening: "Hi ${gcName}," — reference the project and that the quote is attached
2. One crisp sentence on what the scope covers
3. State the total and 30-day validity
4. If hazmat: one sentence noting abatement is included and a full hazmat survey is required before work
5. Offer to discuss or clarify any line items
6. Sign-off: "Best regards,\nEstimating Department\nWest Crow Contracting Ltd.\n604-399-4644\nfabio@westcrow.ca"

Do NOT include a subject line. Under 180 words.`

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  })

  return (msg.content[0] as any).text as string
}

function buildRFC822(params: {
  to: string
  from: string
  subject: string
  body: string
  pdfBuffer: Buffer
  pdfFilename: string
}): string {
  const boundary = `WCC_${Date.now()}`
  const { to, from, subject, body, pdfBuffer, pdfFilename } = params

  // chunk base64 at 76 chars per MIME spec
  const b64raw = pdfBuffer.toString("base64")
  const b64 = b64raw.match(/.{1,76}/g)?.join("\r\n") ?? b64raw

  const parts = [
    `MIME-Version: 1.0`,
    `From: ${from}`,
    to ? `To: ${to}` : `To: `,
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    b64,
    ``,
    `--${boundary}--`,
  ]

  return Buffer.from(parts.join("\r\n")).toString("base64url")
}

function getScheduleTime(deadline: string | null | undefined): string | null {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  // 2 hours before deadline
  d.setHours(d.getHours() - 2)
  // Must be at least 5 minutes in the future
  if (d.getTime() < Date.now() + 5 * 60 * 1000) return null
  return d.toISOString()
}

export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const bid = await getBid(id) as any
    if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let estimateData: any = null
    try { if (bid.estimate_data) estimateData = JSON.parse(bid.estimate_data) } catch {}

    const proposalData = buildProposalData(bid, estimateData)

    // 1. Generate PDF in memory
    const { ProposalDocument } = await import("@/lib/proposal-pdf")
    const pdfBuffer = Buffer.from(await renderToBuffer(React.createElement(ProposalDocument, { data: proposalData }) as any))

    // 2. Generate email body via Claude
    const emailBody = await generateEmailBody(bid, estimateData, proposalData)

    // 3. Build RFC822 multipart message
    const estimateNum = bid.estimate_number ?? id
    const filename    = `WCC-${estimateNum}.pdf`
    const subject     = `Quote – ${bid.project_name} – West Crow Contracting – ${estimateNum}`
    const toEmail     = bid.gc_email || ""
    const fromEmail   = "jp@dehyl.ca"

    const rawMessage = buildRFC822({
      to: toEmail,
      from: fromEmail,
      subject,
      body: emailBody,
      pdfBuffer,
      pdfFilename: filename,
    })

    // 4. Get access token
    const accessToken = await getGmailAccessToken()

    // 5. Create Gmail draft
    const draftRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { raw: rawMessage } }),
    })

    if (!draftRes.ok) {
      const t = await draftRes.text()
      throw new Error(`Gmail draft creation failed: ${draftRes.status} ${t.slice(0, 300)}`)
    }

    const draft = await draftRes.json()
    const draftId = draft.id

    // 6. Attempt scheduled send if deadline exists
    const scheduleTime = getScheduleTime(bid.deadline)
    let scheduledFor: string | null = null

    if (scheduleTime) {
      try {
        const schedRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            raw: rawMessage,
            scheduleTime,
          }),
        })
        if (schedRes.ok) {
          scheduledFor = scheduleTime
        } else {
          const t = await schedRes.text()
          console.warn("Scheduled send failed, kept as draft:", t.slice(0, 200))
        }
      } catch (e) {
        console.warn("Scheduled send error, kept as draft:", e)
      }
    }

    const gmailUrl = `https://mail.google.com/mail/u/0/#drafts/${draftId}`

    // Clean up temp token file if it was exported
    return NextResponse.json({
      ok: true,
      draft_id: draftId,
      gmail_url: gmailUrl,
      scheduled_for: scheduledFor,
      to: toEmail || null,
      no_gc_email: !toEmail,
      subject,
      email_preview: emailBody.slice(0, 300),
    })
  } catch (err: any) {
    console.error("draft-email error:", err)
    return NextResponse.json({ error: err.message ?? "Draft creation failed" }, { status: 500 })
  }
}

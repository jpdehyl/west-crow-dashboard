import { NextRequest, NextResponse } from "next/server"
import { getBid } from "@/lib/sheets"
import { buildProposalData } from "@/lib/proposal-pdf"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const bid = await getBid(id) as any
    if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let estimateData: any = null
    try {
      if (bid.estimate_data) estimateData = JSON.parse(bid.estimate_data)
    } catch {}

    const data = buildProposalData(bid, estimateData)

    // Dynamic import to avoid SSR issues
    const { ProposalDocument } = await import("@/lib/proposal-pdf")
    const buffer = Buffer.from(await renderToBuffer(React.createElement(ProposalDocument, { data }) as any))

    const filename = `WCC-${bid.estimate_number ?? id}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    console.error("proposal PDF error:", err)
    return NextResponse.json({ error: err.message ?? "PDF generation failed" }, { status: 500 })
  }
}

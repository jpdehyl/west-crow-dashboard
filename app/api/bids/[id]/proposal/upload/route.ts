import { NextRequest, NextResponse } from "next/server"
import { getBid } from "@/lib/sheets"
import { buildProposalData } from "@/lib/proposal-pdf"
import { renderToBuffer } from "@react-pdf/renderer"
import React from "react"

export const dynamic = "force-dynamic"
export const maxDuration = 30

type Ctx = { params: Promise<{ id: string }> }

async function getDropboxAccessToken(): Promise<string> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim()
  const appKey = process.env.DROPBOX_APP_KEY?.trim()
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim()

  if (refreshToken && appKey && appSecret) {
    const res = await fetch("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${appKey}&client_secret=${appSecret}`,
    })
    if (res.ok) {
      const data = await res.json()
      if (data.access_token) return data.access_token
    }
  }

  const token = process.env.DROPBOX_TOKEN
  if (!token) throw new Error("No Dropbox credentials configured")
  return token
}

export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const bid = await getBid(id) as any
    if (!bid) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let estimateData: any = null
    try {
      if (bid.estimate_data) estimateData = JSON.parse(bid.estimate_data)
    } catch {}

    const data = buildProposalData(bid, estimateData)
    const { ProposalDocument } = await import("@/lib/proposal-pdf")
    const buffer = Buffer.from(await renderToBuffer(React.createElement(ProposalDocument, { data }) as any))

    const filename = `WCC-${bid.estimate_number ?? id}.pdf`
    const folderName = bid.dropbox_folder ?? bid.project_name ?? id
    const dropboxPath = `/West Crow Estimators/${folderName}/${filename}`

    const token = await getDropboxAccessToken()
    const uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "overwrite",
          autorename: false,
          mute: false,
        }),
      },
      body: new Uint8Array(buffer),
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      throw new Error(`Dropbox upload failed: ${uploadRes.status} ${errText.slice(0, 200)}`)
    }

    const result = await uploadRes.json()
    return NextResponse.json({
      success: true,
      dropbox_path: result.path_display ?? dropboxPath,
      filename,
    })
  } catch (err: any) {
    console.error("proposal upload error:", err)
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 })
  }
}

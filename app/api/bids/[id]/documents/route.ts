// GET /api/bids/[id]/documents
// Fetches documents from Dropbox on-demand for a specific bid

import { NextResponse } from 'next/server'
import { getBid, updateBid } from '@/lib/sheets'

const DOC_TYPE_MAP: Record<string, string> = {
  'Bid Documents': 'bid_docs', 'Bid Docs': 'bid_docs',
  'Drawings': 'drawings', 'Hazmat': 'hazmat', 'Site Documents': 'site_docs',
}
function getDocType(name: string): string | null {
  if (DOC_TYPE_MAP[name]) return DOC_TYPE_MAP[name]
  if (name.toLowerCase().startsWith('takeoff')) return 'quote_sheet'
  return null
}

async function getAccessToken(): Promise<string> {
  const r = process.env.DROPBOX_REFRESH_TOKEN?.trim()
  const k = process.env.DROPBOX_APP_KEY?.trim()
  const s = process.env.DROPBOX_APP_SECRET?.trim()
  if (r && k && s) {
    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${r}&client_id=${k}&client_secret=${s}`,
    })
    if (res.ok) { const d = await res.json(); if (d.access_token) return d.access_token }
  }
  const t = process.env.DROPBOX_TOKEN
  if (!t) throw new Error('No Dropbox credentials')
  return t
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bid = await getBid(id)
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  if (!bid.dropbox_folder) return NextResponse.json({ documents: [] })

  let token: string
  try { token = await getAccessToken() }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }

  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: bid.dropbox_folder, recursive: false }),
  })
  if (!res.ok) return NextResponse.json({ error: 'Dropbox error' }, { status: 502 })
  const data = await res.json()

  const documents = data.entries
    .filter((e: any) => e['.tag'] === 'folder')
    .map((e: any) => ({ name: e.name, url: e.path_display, type: getDocType(e.name) }))
    .filter((d: any) => d.type !== null)

  // Cache in Supabase
  await updateBid(id, { documents })

  return NextResponse.json({ documents })
}

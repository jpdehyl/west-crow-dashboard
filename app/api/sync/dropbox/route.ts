// POST /api/sync/dropbox  (GET also accepted for Vercel cron)
// Syncs /West Crow/ Dropbox folders into Supabase bids table.
// Handles expired token gracefully — returns {error} with 200.

import { NextResponse } from 'next/server'
import { getBids, createBid, updateBid } from '@/lib/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DROPBOX_BASE = '/West Crow'

// Map subfolder names → document types
const DOC_TYPE_MAP: Record<string, string> = {
  'Bid Documents': 'bid_docs',
  'Bid Docs':      'bid_docs',
  'Drawings':      'drawings',
  'Hazmat':        'hazmat',
  'Site Documents':'site_docs',
}

function isSkipped(name: string): boolean {
  if (name.startsWith('.')) return true
  if (name.startsWith('Template')) return true
  if (name.startsWith('ARCHIVE')) return true
  if (name.startsWith('1111')) return true
  return false
}

function getDocType(name: string): string | null {
  if (DOC_TYPE_MAP[name]) return DOC_TYPE_MAP[name]
  if (name.toLowerCase().startsWith('takeoff')) return 'quote_sheet'
  return null
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function dbxList(path: string, token: string) {
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, recursive: false }),
  })

  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    const tag = body?.error?.['.tag'] ?? ''
    throw Object.assign(new Error('expired_token'), { expired: true, tag })
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Dropbox list_folder failed for ${path}: ${err}`)
  }

  const data = await res.json()
  return data.entries as any[]
}

export async function GET() { return POST() }

export async function POST() {
  const token = process.env.DROPBOX_TOKEN
  if (!token) return NextResponse.json({ error: 'DROPBOX_TOKEN not set' }, { status: 500 })

  const summary = { created: 0, updated: 0, skipped: 0, error: undefined as string | undefined }

  let entries: any[]
  try {
    entries = await dbxList(DROPBOX_BASE, token)
  } catch (e: any) {
    if (e.expired) {
      return NextResponse.json({ error: 'DROPBOX_TOKEN expired — refresh needed' })
    }
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }

  const folders = entries.filter((e: any) => e['.tag'] === 'folder')
  const existingBids = await getBids()

  for (const folder of folders) {
    const name: string = folder.name
    const path: string = folder.path_display

    if (isSkipped(name)) { summary.skipped++; continue }

    const id = slugify(name)

    // List subfolders for document mapping
    let subEntries: any[] = []
    try {
      subEntries = await dbxList(path, token)
    } catch (e: any) {
      if (e.expired) return NextResponse.json({ error: 'DROPBOX_TOKEN expired — refresh needed' })
      // Non-fatal — just skip docs for this folder
    }

    const documents = subEntries
      .filter((e: any) => e['.tag'] === 'folder')
      .map((e: any) => ({ name: e.name, url: e.path_display, type: getDocType(e.name) }))
      .filter((d: any) => d.type !== null)

    const existing = existingBids.find((b: any) => b.id === id)

    if (!existing) {
      await createBid({
        id,
        project_name: name,
        status: 'active',
        source: 'dropbox',
        dropbox_folder: path,
        documents,
        timeline: [],
      })
      summary.created++
    } else {
      // Only update documents — never overwrite manually-set bid fields
      await updateBid(id, { documents, dropbox_folder: path })
      summary.updated++
    }
  }

  return NextResponse.json(summary)
}

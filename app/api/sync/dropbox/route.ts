// POST /api/sync/dropbox  (GET also accepted for Vercel cron)
// ⚠️  BLOCKER: DROPBOX_TOKEN in .env is EXPIRED as of 2026-02-27.
// JP must generate a fresh long-lived token at https://www.dropbox.com/developers/apps
// and set DROPBOX_TOKEN in Vercel env vars before this endpoint will work.
// Syncs West Crow Estimators Dropbox folders into KV bids.

import { NextResponse } from 'next/server'
import { getBids, createBid, updateBid } from '@/lib/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DROPBOX_BASE = '/West Crow'

// Folders to skip
const SKIP_NAMES = ['1111 COMPLETED', 'Demo Quote Sheet']

// Map subfolder names → document types
const DOC_TYPE_MAP: Record<string, string> = {
  'Bid Documents': 'bid_docs',
  'Bid Docs':      'bid_docs',
  'Drawings':      'drawings',
  'Hazmat':        'hazmat',
  'Site Documents':'site_docs',
  'Takeoff - Virtual Estimator': 'quote_sheet',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Dropbox list_folder failed for ${path}: ${err}`)
  }
  const data = await res.json()
  return data.entries as any[]
}

export async function GET() {
  return POST()
}

export async function POST() {
  const token = process.env.DROPBOX_TOKEN
  if (!token) return NextResponse.json({ error: 'DROPBOX_TOKEN not set' }, { status: 500 })

  const summary = { created: 0, updated: 0, skipped: 0 }

  // List top-level folders
  const entries = await dbxList(DROPBOX_BASE, token)
  const folders = entries.filter((e: any) => e['.tag'] === 'folder')

  const existingBids = await getBids()

  for (const folder of folders) {
    const name: string = folder.name
    const path: string = folder.path_display

    // Skip rules
    if (SKIP_NAMES.includes(name) || name.startsWith('.')) {
      summary.skipped++
      continue
    }

    const id = slugify(name)

    // List subfolders for document mapping
    let subEntries: any[] = []
    try {
      subEntries = await dbxList(path, token)
    } catch {
      // Non-fatal — just no docs
    }

    const documents = subEntries
      .filter((e: any) => e['.tag'] === 'folder' && DOC_TYPE_MAP[e.name])
      .map((e: any) => ({
        name: e.name,
        url: e.path_display,
        type: DOC_TYPE_MAP[e.name],
      }))

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
      // Only update documents — never overwrite manually-set fields
      await updateBid(id, { documents, dropbox_folder: path })
      summary.updated++
    }
  }

  return NextResponse.json(summary)
}

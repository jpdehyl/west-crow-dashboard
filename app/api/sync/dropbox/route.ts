// POST /api/sync/dropbox  (GET also accepted for Vercel cron)
// Syncs /West Crow Estimators/ Dropbox folders into Supabase bids table.
// Uses refresh token for permanent auth — never expires.

import { NextResponse } from 'next/server'
import { getBids, createBid, updateBid } from '@/lib/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DROPBOX_BASE = '/West Crow Estimators'

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim()
  const appKey = process.env.DROPBOX_APP_KEY?.trim()
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim()

  if (refreshToken && appKey && appSecret) {
    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${appKey}&client_secret=${appSecret}`,
    })
    if (res.ok) {
      const data = await res.json()
      if (data.access_token) return data.access_token
    }
  }

  const token = process.env.DROPBOX_TOKEN
  if (!token) throw new Error('No Dropbox credentials configured')
  return token
}

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
  if (name === 'Zoom Recordings') return true
  if (name === 'Training') return true
  if (name === 'Demo Quote Sheet') return true
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
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Dropbox list_folder failed for ${path}: ${err}`)
  }
  const data = await res.json()
  return data.entries as any[]
}

export async function GET() { return POST() }

export async function POST() {
  let token: string
  try {
    token = await getAccessToken()
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 })
  }

  const summary = { created: 0, updated: 0, skipped: 0, error: undefined as string | undefined }

  let entries: any[]
  try {
    entries = await dbxList(DROPBOX_BASE, token)
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }

  const folders = entries.filter((e: any) => e['.tag'] === 'folder')
  const existingBids = await getBids()

  for (const folder of folders) {
    const name: string = folder.name
    const path: string = folder.path_display

    if (isSkipped(name)) { summary.skipped++; continue }

    const id = slugify(name)

    let subEntries: any[] = []
    try {
      subEntries = await dbxList(path, token)
    } catch {
      // Non-fatal
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
      await updateBid(id, { documents, dropbox_folder: path })
      summary.updated++
    }
  }

  return NextResponse.json(summary)
}

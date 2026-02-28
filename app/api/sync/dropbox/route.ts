// POST /api/sync/dropbox  (GET also accepted for Vercel cron)
// Syncs /West Crow Estimators/ Dropbox folders into Supabase bids table.
// Uses refresh token for permanent auth — never expires.

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function shortHash(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

type DropboxEntry = {
  '.tag': string
  name: string
  path_display: string
}

type DropboxListResponse = {
  entries: DropboxEntry[]
  cursor: string
  has_more: boolean
}

type BidUpsertRow = {
  id: string
  project_name: string
  dropbox_folder: string
  status: string
  source: string
}

async function dbxList(path: string, token: string): Promise<DropboxListResponse> {
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
  return await res.json()
}

async function dbxListContinue(cursor: string, token: string): Promise<DropboxListResponse> {
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cursor }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Dropbox list_folder/continue failed: ${err}`)
  }

  return await res.json()
}

async function getSyncCursor(): Promise<string | null> {
  const { data, error } = await supabase.from('sync_state').select('value').eq('key', 'dropbox_cursor').single()
  if (error) return null
  return data?.value ?? null
}

async function saveSyncCursor(cursor: string): Promise<void> {
  const { error } = await supabase.from('sync_state').upsert(
    { key: 'dropbox_cursor', value: cursor, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  )

  if (error) throw new Error(`Failed to save sync cursor: ${error.message}`)
}

async function upsertBidsInChunks(rows: BidUpsertRow[]): Promise<void> {
  const CHUNK_SIZE = 500
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase.from('bids').upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`)
  }
}

async function buildUpsertRows(folderEntries: DropboxEntry[]): Promise<{ rows: BidUpsertRow[]; skipped: number }> {
  const filtered = folderEntries.filter((entry) => entry['.tag'] === 'folder' && !isSkipped(entry.name))
  const skipped = folderEntries.filter((entry) => entry['.tag'] === 'folder').length - filtered.length

  const slugToNames = new Map<string, Set<string>>()
  for (const folder of filtered) {
    const slug = slugify(folder.name)
    if (!slugToNames.has(slug)) slugToNames.set(slug, new Set())
    slugToNames.get(slug)!.add(folder.name)
  }

  const isCollidingSlug = (slug: string) => (slugToNames.get(slug)?.size ?? 0) > 1

  const basicRows = filtered
    .map((folder) => {
      const baseSlug = slugify(folder.name)
      if (!baseSlug) return null
      const id = isCollidingSlug(baseSlug) ? `${baseSlug}-${shortHash(folder.name)}` : baseSlug
      return {
        id,
        project_name: folder.name,
        dropbox_folder: folder.path_display,
        status: 'active',
        source: 'dropbox',
      }
    })
    .filter((row): row is BidUpsertRow => Boolean(row))

  if (basicRows.length === 0) return { rows: [], skipped }

  // Skip status preservation check on large batches — upsert uses onConflict to preserve existing fields
  return { rows: basicRows, skipped }
}

export async function GET(request: Request) { return POST(request) }

export async function POST(request: Request) {
  let token: string
  try {
    token = await getAccessToken()
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 500 })
  }

  const url = new URL(request.url)
  const forceFull = url.searchParams.get('full') === 'true'

  const summary = {
    mode: 'incremental' as 'full' | 'incremental',
    processed: 0,
    skipped: 0,
    cursor_saved: false,
  }

  try {
    const { count: bidCount, error: bidCountError } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })

    if (bidCountError) throw new Error(`Failed to count bids: ${bidCountError.message}`)

    const existingCursor = await getSyncCursor()
    const shouldRunFull = forceFull || (bidCount ?? 0) === 0 || !existingCursor

    if (shouldRunFull) {
      summary.mode = 'full'

      let response = await dbxList(DROPBOX_BASE, token)
      let allEntries: DropboxEntry[] = [...response.entries]
      while (response.has_more) {
        response = await dbxListContinue(response.cursor, token)
        allEntries = allEntries.concat(response.entries)
      }

      const { rows, skipped } = await buildUpsertRows(allEntries)
      summary.skipped = skipped
      await upsertBidsInChunks(rows)
      summary.processed = rows.length

      await saveSyncCursor(response.cursor)
      summary.cursor_saved = true
      return NextResponse.json(summary)
    }

    const response = await dbxListContinue(existingCursor, token)
    const { rows, skipped } = await buildUpsertRows(response.entries)
    summary.skipped = skipped
    await upsertBidsInChunks(rows)
    summary.processed = rows.length

    await saveSyncCursor(response.cursor)
    summary.cursor_saved = true
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message) }, { status: 502 })
  }

  return NextResponse.json(summary)
}

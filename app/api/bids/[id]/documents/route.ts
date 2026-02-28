// GET /api/bids/[id]/documents
// Fetches documents from Dropbox on-demand for a specific bid

import { NextResponse } from 'next/server'
import { addBidDocument, getBid, updateBid } from '@/lib/sheets'
import { extractDropboxPath, isDropboxSharedLink, isDropboxUrl } from '@/lib/dropbox'

const DOC_TYPE_MAP: Record<string, string> = {
  'Bid Documents': 'bid_docs', 'Bid Docs': 'bid_docs',
  Drawings: 'drawings', Hazmat: 'hazmat', 'Site Documents': 'site_docs',
}

function getDocType(name: string): string | null {
  if (DOC_TYPE_MAP[name]) return DOC_TYPE_MAP[name]
  if (name.toLowerCase().startsWith('takeoff')) return 'quote_sheet'
  if (name.toLowerCase().startsWith('addenda')) return 'addendum'
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

function buildDropboxListBody(pathOrUrl: string): { path: string; recursive: boolean; shared_link?: { url: string } } {
  const normalizedPath = extractDropboxPath(pathOrUrl)
  if (normalizedPath) return { path: normalizedPath, recursive: false }
  if (isDropboxSharedLink(pathOrUrl)) return { path: '', recursive: false, shared_link: { url: pathOrUrl } }
  return { path: pathOrUrl, recursive: false }
}

async function listDropboxFolder(pathOrLink: string, token: string): Promise<any[] | null> {
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildDropboxListBody(pathOrLink)),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.entries ?? []
}

async function searchFolderByProjectName(projectName: string, token: string): Promise<string | null> {
  if (!projectName) return null

  const res = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: projectName,
      options: { path: '', max_results: 25, file_status: 'active', filename_only: true },
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const matches = (data.matches ?? []) as any[]
  const folders = matches
    .map((match) => match.metadata?.metadata)
    .filter((metadata) => metadata?.['.tag'] === 'folder' && typeof metadata.path_display === 'string')

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normalizedProject = normalize(projectName)
  const exact = folders.find((folder) => normalize(String(folder.name ?? '')) === normalizedProject)

  return exact?.path_display ?? folders[0]?.path_display ?? null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bid = await getBid(id)
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  if (!bid.dropbox_folder) return NextResponse.json({ documents: [] })

  let token: string
  try { token = await getAccessToken() }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }

  let entries = await listDropboxFolder(bid.dropbox_folder, token)
  if (!entries && bid.project_name) {
    const discoveredFolder = await searchFolderByProjectName(bid.project_name, token)
    if (discoveredFolder) {
      entries = await listDropboxFolder(discoveredFolder, token)
      if (entries) await updateBid(id, { dropbox_folder: discoveredFolder })
    }
  }

  if (!entries) return NextResponse.json({ error: 'Dropbox error' }, { status: 502 })

  const documents = entries
    .filter((e: any) => e['.tag'] === 'folder')
    .map((e: any) => ({ name: e.name, url: e.path_display, type: getDocType(e.name) }))
    .filter((d: any) => d.type !== null)

  await updateBid(id, { documents })
  return NextResponse.json({ documents })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bid = await getBid(id)
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })

  const body = await req.json()
  const name = String(body?.name ?? '').trim()
  const url = String(body?.url ?? '').trim()
  const type = String(body?.type ?? 'other').trim() || 'other'

  if (!name || !url) {
    return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
  }

  const normalizedUrl = isDropboxUrl(url)
    ? (extractDropboxPath(url) ?? url)
    : url

  await addBidDocument(id, { name, url: normalizedUrl, type })
  return NextResponse.json({ ok: true })
}

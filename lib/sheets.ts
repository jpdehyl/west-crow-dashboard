// Data layer — Vercel KV backend
// Replaces the Google Apps Script / SHEETS_API_URL approach.
// KV keys: "bids", "clients", "projects"
// On first run, seeds with empty arrays (no static seed data).

import { kv } from '@vercel/kv'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function kvGet<T>(key: string): Promise<T[]> {
  const val = await kv.get<T[]>(key)
  if (!val) {
    await kv.set(key, [])
    return []
  }
  return val
}

async function kvSet<T>(key: string, data: T[]): Promise<void> {
  await kv.set(key, data)
}

// ── Bids ─────────────────────────────────────────────────────────────────────

export async function getBids() {
  return kvGet<any>('bids')
}

export async function getBid(id: string) {
  const bids = await getBids()
  return bids.find((b: any) => b.id === id) ?? null
}

export async function createBid(data: object) {
  const bids = await getBids()
  const bid = { created_at: new Date().toISOString(), ...data }
  bids.push(bid)
  await kvSet('bids', bids)
  return bid
}

export async function updateBid(id: string, data: object) {
  const bids = await getBids()
  const idx = bids.findIndex((b: any) => b.id === id)
  if (idx === -1) return null
  bids[idx] = { ...bids[idx], ...data }
  await kvSet('bids', bids)
  return bids[idx]
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects() {
  return kvGet<any>('projects')
}

export async function getProject(id: string) {
  const all = await getProjects()
  return all.find((p: any) => p.id === id) ?? null
}

export async function addDailyLog(projectId: string, data: object) {
  const projects = await getProjects()
  const idx = projects.findIndex((p: any) => p.id === projectId)
  if (idx === -1) return null
  projects[idx].logs = [...(projects[idx].logs ?? []), { ...data, created_at: new Date().toISOString() }]
  await kvSet('projects', projects)
  return projects[idx]
}

export async function addCost(projectId: string, data: object) {
  const projects = await getProjects()
  const idx = projects.findIndex((p: any) => p.id === projectId)
  if (idx === -1) return null
  projects[idx].costs = [...(projects[idx].costs ?? []), { ...data, created_at: new Date().toISOString() }]
  await kvSet('projects', projects)
  return projects[idx]
}

export async function createInvoice(projectId: string, data: object) {
  const projects = await getProjects()
  const idx = projects.findIndex((p: any) => p.id === projectId)
  if (idx === -1) return null
  projects[idx].invoices = [...(projects[idx].invoices ?? []), { ...data, created_at: new Date().toISOString() }]
  await kvSet('projects', projects)
  return projects[idx]
}

export async function updateInvoice(projectId: string, data: object) {
  const projects = await getProjects()
  const idx = projects.findIndex((p: any) => p.id === projectId)
  if (idx === -1) return null
  const invIdx = (projects[idx].invoices ?? []).findIndex((i: any) => i.id === (data as any).id)
  if (invIdx !== -1) {
    projects[idx].invoices[invIdx] = { ...projects[idx].invoices[invIdx], ...data }
  }
  await kvSet('projects', projects)
  return projects[idx]
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClients() {
  return kvGet<any>('clients')
}

export async function createClient(data: object) {
  const clients = await getClients()
  const client = { created_at: new Date().toISOString(), ...data }
  clients.push(client)
  await kvSet('clients', clients)
  return client
}

// ── Bid documents & timeline ───────────────────────────────────────────────────

export async function addBidDocument(bidId: string, data: object) {
  const bids = await getBids()
  const idx = bids.findIndex((b: any) => b.id === bidId)
  if (idx === -1) return null
  bids[idx].documents = [...(bids[idx].documents ?? []), data]
  await kvSet('bids', bids)
  return bids[idx]
}

export async function addBidTimeline(bidId: string, data: object) {
  const bids = await getBids()
  const idx = bids.findIndex((b: any) => b.id === bidId)
  if (idx === -1) return null
  bids[idx].timeline = [...(bids[idx].timeline ?? []), data]
  await kvSet('bids', bids)
  return bids[idx]
}

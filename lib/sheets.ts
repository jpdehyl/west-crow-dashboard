// Data layer — Supabase Postgres backend
// Replaces Vercel KV. Same exported function signatures.

import { supabase } from './supabase'

function normalizeBidRow(row: any) {
  return {
    ...row,
    project_name: row?.project_name ?? row?.projectName ?? row?.name ?? '',
    client: row?.client ?? row?.client_name ?? row?.clientName ?? '',
  }
}

// ── Bids ─────────────────────────────────────────────────────────────────────

export async function getBids() {
  const pageSize = 1000
  let from = 0
  const allRows: any[] = []

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)

    const rows = data ?? []
    allRows.push(...rows)

    if (rows.length < pageSize) break
    from += pageSize
  }

  return allRows.map(normalizeBidRow)
}

export async function getBid(id: string) {
  const { data, error } = await supabase.from('bids').select('*').eq('id', id).single()
  if (error) return null
  return normalizeBidRow(data)
}

export async function createBid(data: object) {
  const bid = { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data }
  const { data: result, error } = await supabase.from('bids').insert(bid).select().single()
  if (error) throw new Error(error.message)
  return result
}

export async function updateBid(id: string, data: object) {
  const { data: result, error } = await supabase
    .from('bids')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return result
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function getClients() {
  const { data, error } = await supabase.from('clients').select('*').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createClient(data: object) {
  const client = { created_at: new Date().toISOString(), ...data }
  const { data: result, error } = await supabase.from('clients').insert(client).select().single()
  if (error) throw new Error(error.message)
  return result
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getProject(id: string) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
  if (error) return null
  return data
}

export async function addDailyLog(projectId: string, data: object) {
  const project = await getProject(projectId)
  if (!project) return null
  const logs = [...(project.logs ?? []), { ...data, created_at: new Date().toISOString() }]
  const { data: result, error } = await supabase.from('projects').update({ logs }).eq('id', projectId).select().single()
  if (error) throw new Error(error.message)
  return result
}

export async function addCost(projectId: string, data: object) {
  const project = await getProject(projectId)
  if (!project) return null
  const costs = [...(project.costs ?? []), { ...data, created_at: new Date().toISOString() }]
  const { data: result, error } = await supabase.from('projects').update({ costs }).eq('id', projectId).select().single()
  if (error) throw new Error(error.message)
  return result
}

export async function createInvoice(projectId: string, data: object) {
  const project = await getProject(projectId)
  if (!project) return null
  const invoices = [...(project.invoices ?? []), { ...data, created_at: new Date().toISOString() }]
  const { data: result, error } = await supabase.from('projects').update({ invoices }).eq('id', projectId).select().single()
  if (error) throw new Error(error.message)
  return result
}

export async function updateInvoice(projectId: string, data: object) {
  const project = await getProject(projectId)
  if (!project) return null
  const invoices = (project.invoices ?? []).map((i: any) => i.id === (data as any).id ? { ...i, ...data } : i)
  const { data: result, error } = await supabase.from('projects').update({ invoices }).eq('id', projectId).select().single()
  if (error) throw new Error(error.message)
  return result
}

// ── Bid documents & timeline ───────────────────────────────────────────────────

export async function addBidDocument(bidId: string, data: object) {
  const bid = await getBid(bidId)
  if (!bid) return null
  const documents = [...(bid.documents ?? []), data]
  return updateBid(bidId, { documents })
}

export async function addBidTimeline(bidId: string, data: object) {
  const bid = await getBid(bidId)
  if (!bid) return null
  const timeline = [...(bid.timeline ?? []), data]
  return updateBid(bidId, { timeline })
}

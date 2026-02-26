// Sheets API client — calls Google Apps Script web app
// Falls back to static seed data if SHEETS_API_URL is not set

import { BIDS, PROJECTS, CLIENTS } from './data'

const API_URL = process.env.SHEETS_API_URL
const API_KEY = process.env.SHEETS_API_KEY || 'wc_2026_xK9mP'

async function call(path: string, method = 'GET', body?: object) {
  if (!API_URL) return null
  try {
    const url = new URL(API_URL)
    url.searchParams.set('key', API_KEY)
    url.searchParams.set('path', path)
    if (method !== 'GET' && method !== 'POST') {
      url.searchParams.set('method', method)
    }
    const res = await fetch(url.toString(), {
      method: method === 'GET' ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      redirect: 'follow',
    })
    if (!res.ok) return null
    const data = await res.json()
    // If GAS returns an error object, treat as miss → fallback to seed
    if (data && typeof data === 'object' && !Array.isArray(data) && data.error) return null
    return data
  } catch {
    return null
  }
}

export async function getBids() {
  return (await call('bids')) ?? BIDS
}

export async function getBid(id: string) {
  return (await call(`bids/${id}`)) ?? BIDS.find(b => b.id === id) ?? null
}

export async function createBid(data: object) {
  return call('bids', 'POST', data)
}

export async function updateBid(id: string, data: object) {
  return call(`bids/${id}`, 'PATCH', data)
}

export async function getProjects() {
  return (await call('projects')) ?? PROJECTS
}

export async function addDailyLog(projectId: string, data: object) {
  return call(`projects/${projectId}/logs`, 'POST', data)
}

export async function addCost(projectId: string, data: object) {
  return call(`projects/${projectId}/costs`, 'POST', data)
}

export async function createInvoice(projectId: string, data: object) {
  return call(`projects/${projectId}/invoices`, 'POST', data)
}

export async function updateInvoice(projectId: string, data: object) {
  return call(`projects/${projectId}/invoices`, 'PATCH', data)
}

export async function getProject(id: string) {
  const all = await getProjects()
  return all.find((p: { id: string }) => p.id === id) ?? null
}

export async function getClients() {
  return (await call('clients')) ?? CLIENTS
}

export async function createClient(data: object) {
  return call('clients', 'POST', data)
}

export async function addBidDocument(bidId: string, data: object) {
  return call(`bids/${bidId}/documents`, 'POST', data)
}

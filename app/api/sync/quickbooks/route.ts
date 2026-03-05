export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getAccessToken(): Promise<{ token: string; realmId: string } | null> {
  const { data: rows } = await supabase
    .from('sync_state')
    .select('key,value')
    .in('key', ['qb_access_token', 'qb_refresh_token', 'qb_token_expiry', 'qb_realm_id'])

  if (!rows || rows.length === 0) return null

  const get = (k: string) => rows.find(r => r.key === k)?.value ?? ''
  const realmId      = get('qb_realm_id')
  const accessToken  = get('qb_access_token')
  const refreshToken = get('qb_refresh_token')
  const expiry       = Number(get('qb_token_expiry') || 0)

  if (!realmId || !refreshToken) return null

  // Refresh if expired (or within 5 min)
  if (Date.now() < expiry - 300_000) {
    return { token: accessToken, realmId }
  }

  const clientId     = process.env.QUICKBOOKS_CLIENT_ID!
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!

  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })

  const tokens = await res.json()
  if (!res.ok) return null

  const now = new Date().toISOString()
  await supabase.from('sync_state').upsert({ key: 'qb_access_token', value: tokens.access_token, updated_at: now }, { onConflict: 'key' })
  await supabase.from('sync_state').upsert({ key: 'qb_token_expiry', value: String(Date.now() + tokens.expires_in * 1000), updated_at: now }, { onConflict: 'key' })
  if (tokens.refresh_token) {
    await supabase.from('sync_state').upsert({ key: 'qb_refresh_token', value: tokens.refresh_token, updated_at: now }, { onConflict: 'key' })
  }

  return { token: tokens.access_token, realmId }
}

async function qbQuery(token: string, realmId: string, query: string) {
  const base = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

  const res = await fetch(
    `${base}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`QB API error: ${res.status}`)
  return res.json()
}

export async function GET() {
  try {
    const auth = await getAccessToken()
    if (!auth) {
      return NextResponse.json({ error: 'QuickBooks not connected. Visit /api/auth/quickbooks to authorize.' }, { status: 401 })
    }
    const { token, realmId } = auth

    // Fetch all invoices (last 365 days)
    const invoiceData = await qbQuery(token, realmId,
      `SELECT Id, DocNumber, CustomerRef, TotalAmt, Balance, TxnDate, DueDate, LinkedTxn FROM Invoice WHERE TxnDate >= '2025-01-01' ORDERBY TxnDate DESC MAXRESULTS 500`
    )
    const invoices = invoiceData?.QueryResponse?.Invoice ?? []

    // Fetch all bills/expenses (last 365 days)
    const billData = await qbQuery(token, realmId,
      `SELECT Id, DocNumber, VendorRef, TotalAmt, TxnDate, Line FROM Bill WHERE TxnDate >= '2025-01-01' ORDERBY TxnDate DESC MAXRESULTS 500`
    )
    const bills = billData?.QueryResponse?.Bill ?? []

    // Group by project (match DocNumber or CustomerMemo to job number pattern YYMMXXX)
    const jobPattern = /\b(2[45]\d{2}\d{3})\b/

    const projectMap: Record<string, { invoiced: number; paid: number; expenses: number; invoices: any[]; bills: any[] }> = {}

    for (const inv of invoices) {
      const ref = inv.CustomerRef?.name ?? inv.DocNumber ?? ''
      const match = ref.match(jobPattern) ?? inv.DocNumber?.match(jobPattern)
      const jobId = match?.[1] ?? 'unmatched'
      if (!projectMap[jobId]) projectMap[jobId] = { invoiced: 0, paid: 0, expenses: 0, invoices: [], bills: [] }
      projectMap[jobId].invoiced   += parseFloat(inv.TotalAmt ?? 0)
      projectMap[jobId].paid       += parseFloat(inv.TotalAmt ?? 0) - parseFloat(inv.Balance ?? 0)
      projectMap[jobId].invoices.push({ id: inv.Id, date: inv.TxnDate, amount: inv.TotalAmt, balance: inv.Balance, customer: inv.CustomerRef?.name })
    }

    for (const bill of bills) {
      const ref = bill.DocNumber ?? ''
      const match = ref.match(jobPattern)
      const jobId = match?.[1] ?? 'unmatched'
      if (!projectMap[jobId]) projectMap[jobId] = { invoiced: 0, paid: 0, expenses: 0, invoices: [], bills: [] }
      projectMap[jobId].expenses += parseFloat(bill.TotalAmt ?? 0)
      projectMap[jobId].bills.push({ id: bill.Id, date: bill.TxnDate, amount: bill.TotalAmt, vendor: bill.VendorRef?.name })
    }

    // Save summary to sync_state
    await supabase.from('sync_state').upsert({
      key: 'qb_project_summary',
      value: JSON.stringify(projectMap),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })

    const summary = Object.entries(projectMap)
      .filter(([k]) => k !== 'unmatched')
      .map(([jobId, d]) => ({
        jobId,
        invoiced:  d.invoiced,
        collected: d.paid,
        expenses:  d.expenses,
        margin:    d.invoiced > 0 ? Math.round((d.invoiced - d.expenses) / d.invoiced * 100) + '%' : 'N/A'
      }))
      .sort((a, b) => b.invoiced - a.invoiced)

    return NextResponse.json({
      ok: true,
      synced_at: new Date().toISOString(),
      projects: summary,
      unmatched_invoices: projectMap['unmatched']?.invoices?.length ?? 0,
      unmatched_bills:    projectMap['unmatched']?.bills?.length ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

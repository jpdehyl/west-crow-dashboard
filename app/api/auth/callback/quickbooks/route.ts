export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code     = searchParams.get('code')
  const realmId  = searchParams.get('realmId')
  const error    = searchParams.get('error')

  if (error || !code || !realmId) {
    return NextResponse.json({ error: error || 'Missing code or realmId' }, { status: 400 })
  }

  const clientId     = process.env.QUICKBOOKS_CLIENT_ID!
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!
  const redirectUri  = process.env.QUICKBOOKS_REDIRECT_URI!

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Token exchange failed', details: tokens }, { status: 500 })
  }

  // Store in sync_state
  const now = new Date().toISOString()
  const upserts = [
    { key: 'qb_realm_id',      value: realmId,                  updated_at: now },
    { key: 'qb_access_token',  value: tokens.access_token,      updated_at: now },
    { key: 'qb_refresh_token', value: tokens.refresh_token,     updated_at: now },
    { key: 'qb_token_expiry',  value: String(Date.now() + tokens.expires_in * 1000), updated_at: now },
  ]

  for (const row of upserts) {
    await supabase.from('sync_state').upsert(row, { onConflict: 'key' })
  }

  return new NextResponse(`
    <html><body style="font-family:sans-serif;padding:40px;background:#1A2A43;color:white;">
      <h2 style="color:#C6AF37">✅ QuickBooks Connected!</h2>
      <p>Realm ID: <code>${realmId}</code></p>
      <p>Tokens saved. You can close this window.</p>
    </body></html>
  `, { headers: { 'Content-Type': 'text/html' } })
}

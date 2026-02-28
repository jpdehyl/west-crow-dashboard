import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim()
  const appKey = process.env.DROPBOX_APP_KEY?.trim()
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim()

  let exchangeResult: any = null
  if (refreshToken && appKey && appSecret) {
    const body = `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${appKey}&client_secret=${appSecret}`
    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const text = await res.text()
    exchangeResult = { status: res.status, snippet: text.slice(0, 300) }
  }

  return NextResponse.json({
    hasRefresh: !!refreshToken,
    hasKey: !!appKey,
    hasSecret: !!appSecret,
    refreshLen: refreshToken?.length ?? 0,
    exchangeResult,
  })
}

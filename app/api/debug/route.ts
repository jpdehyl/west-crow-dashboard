export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.SHEETS_API_URL
  const key = process.env.SHEETS_API_KEY

  // Test the GAS endpoint directly
  let gasResult = null
  let gasError = null
  if (url && key) {
    try {
      const testUrl = new URL(url)
      testUrl.searchParams.set('key', key)
      testUrl.searchParams.set('path', 'bids')
      const res = await fetch(testUrl.toString(), { redirect: 'follow', cache: 'no-store' })
      const text = await res.text()
      gasResult = { status: res.status, bodyPreview: text.slice(0, 100) }
    } catch (e: unknown) {
      gasError = e instanceof Error ? e.message : String(e)
    }
  }

  return NextResponse.json({
    SHEETS_API_URL: url ? `${url.slice(0, 60)}...` : 'NOT SET',
    SHEETS_API_KEY: key ? `${key.slice(0, 4)}...` : 'NOT SET',
    gasResult,
    gasError,
  })
}

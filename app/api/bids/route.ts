export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getBids, createBid } from '@/lib/sheets'

export async function GET() {
  const bids = await getBids()
  return NextResponse.json(bids)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const bid  = await createBid(body)
  return NextResponse.json(bid, { status: 201 })
}

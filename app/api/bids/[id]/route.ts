export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getBid, updateBid } from '@/lib/sheets'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params
  const bid = await getBid(id)
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(bid)
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()
  const bid    = await updateBid(id, body)
  return NextResponse.json(bid)
}

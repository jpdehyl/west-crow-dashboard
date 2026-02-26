import { NextRequest, NextResponse } from 'next/server'
import { addCost } from '@/lib/sheets'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()
  const cost   = await addCost(id, body)
  return NextResponse.json(cost, { status: 201 })
}

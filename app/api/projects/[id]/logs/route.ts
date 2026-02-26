import { NextRequest, NextResponse } from 'next/server'
import { addDailyLog } from '@/lib/sheets'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()
  const log    = await addDailyLog(id, body)
  return NextResponse.json(log, { status: 201 })
}

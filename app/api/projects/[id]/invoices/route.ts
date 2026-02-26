import { NextRequest, NextResponse } from 'next/server'
import { createInvoice, updateInvoice } from '@/lib/sheets'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()
  const inv    = await createInvoice(id, body)
  return NextResponse.json(inv, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()
  return NextResponse.json(await updateInvoice(id, body))
}

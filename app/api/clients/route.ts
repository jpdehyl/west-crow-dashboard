export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getClients, createClient } from '@/lib/sheets'

export async function GET() {
  const clients = await getClients()
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const body   = await req.json()
  const client = await createClient(body)
  return NextResponse.json(client, { status: 201 })
}

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getProjects } from '@/lib/sheets'

export async function GET() {
  const projects = await getProjects()
  return NextResponse.json(projects)
}

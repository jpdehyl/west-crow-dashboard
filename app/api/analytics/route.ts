import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const EMPTY = {
  generated_at: null,
  totals: {
    total_revenue: null,
    total_cost: null,
    gross_profit: null,
    gross_margin_pct: null,
    job_count: null,
  },
  clients: {
    revenue_by_client: [],
    top_10_clients: [],
    top_client: null,
  },
  kpis: {
    total_revenue: null,
    average_gp_pct: null,
    top_client_by_revenue: null,
  },
}

export async function GET() {
  try {
    const filePath = resolve(process.cwd(), "data/financials.json")
    const raw = await readFile(filePath, "utf8")
    const parsed = JSON.parse(raw)
    return NextResponse.json({ ok: true, data: parsed })
  } catch {
    return NextResponse.json({ ok: true, data: EMPTY })
  }
}

import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"

type Cell = string | number | boolean | null

type SheetRows = { name: string; rows: Cell[][] }

type RevenueRow = { client: string; revenue: number }

type ProductionJob = { sheet: string; client: string; address: string; contract_price: number }

type Financials = {
  generated_at: string
  totals: {
    total_revenue: number
    total_cost: number
    gross_profit: number
    gross_margin_pct: number
    job_count: number
  }
  clients: {
    revenue_by_client: RevenueRow[]
    top_10_clients: RevenueRow[]
    top_client: RevenueRow | null
  }
  production: {
    jobs: ProductionJob[]
    total_production_revenue: number
  }
  kpis: {
    total_revenue: number
    average_gp_pct: number
    top_client_by_revenue: RevenueRow | null
  }
}

const JOBS_PATH = "/tmp/jobs_report.xlsx"
const CLIENTS_PATH = "/tmp/client_list_2024.xlsx"
const PRODUCTION_PATH = "/tmp/wcc_production.xlsx"
const OUT_PATH = resolve(process.cwd(), "data/financials.json")

function n(value: Cell): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  const neg = trimmed.startsWith("(") && trimmed.endsWith(")")
  const cleaned = trimmed.replace(/[$,%\s,()]/g, "")
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return 0
  return neg ? -parsed : parsed
}

function t(value: Cell): string {
  if (value == null) return ""
  return String(value)
}

async function tryReadWithXlsx(filePath: string): Promise<SheetRows[] | null> {
  try {
    const xlsxModule = await import("xlsx")
    const xlsx = (xlsxModule as { default?: typeof import("xlsx") } & typeof import("xlsx")).default ?? xlsxModule
    const workbook = xlsx.readFile(filePath)
    return workbook.SheetNames.map((name) => {
      const rows = xlsx.utils.sheet_to_json<Cell[]>(workbook.Sheets[name], { header: 1, raw: true, defval: null })
      return { name, rows }
    })
  } catch {
    return null
  }
}

function readWithPythonFallback(filePath: string): SheetRows[] {
  const script = `
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(${JSON.stringify(filePath)})
if not path.exists():
    print(json.dumps([]))
    raise SystemExit(0)

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

def col_index(ref: str) -> int:
    m = re.match(r"([A-Z]+)", ref or "A1")
    if not m:
        return 0
    col = m.group(1)
    out = 0
    for ch in col:
        out = out * 26 + (ord(ch) - 64)
    return out - 1

with zipfile.ZipFile(path, "r") as zf:
    shared = []
    if "xl/sharedStrings.xml" in zf.namelist():
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        for si in root.findall("main:si", NS):
            shared.append("".join((n.text or "") for n in si.findall(".//main:t", NS)))

    wb = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_map = {}
    for rel in rels.findall("pkgrel:Relationship", NS):
        rid = rel.attrib.get("Id")
        target = rel.attrib.get("Target", "")
        if rid:
            rel_map[rid] = target

    out = []
    for sh in wb.findall("main:sheets/main:sheet", NS):
        name = sh.attrib.get("name", "Sheet")
        rid = sh.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        target = rel_map.get(rid, "")
        if not target:
            continue
        p = "xl/" + target
        if p not in zf.namelist():
            continue

        root = ET.fromstring(zf.read(p))
        rows = []
        for row in root.findall("main:sheetData/main:row", NS):
            vals = []
            for c in row.findall("main:c", NS):
                idx = col_index(c.attrib.get("r", "A1"))
                while len(vals) <= idx:
                    vals.append(None)
                ctype = c.attrib.get("t")
                val = None
                if ctype == "inlineStr":
                    node = c.find("main:is/main:t", NS)
                    val = node.text if node is not None else None
                else:
                    node = c.find("main:v", NS)
                    txt = node.text if node is not None else None
                    if txt is None:
                        val = None
                    elif ctype == "s":
                        try:
                            val = shared[int(txt)]
                        except Exception:
                            val = txt
                    else:
                        try:
                            num = float(txt)
                            val = int(num) if num.is_integer() else num
                        except Exception:
                            val = txt
                vals[idx] = val
            rows.append(vals)

        out.append({"name": name, "rows": rows})

    print(json.dumps(out))
`

  const proc = spawnSync("python", ["-c", script], { encoding: "utf8" })
  if (proc.status !== 0) {
    throw new Error(proc.stderr || "python fallback failed")
  }
  const parsed = JSON.parse(proc.stdout || "[]") as SheetRows[]
  return Array.isArray(parsed) ? parsed : []
}

async function readWorkbook(filePath: string): Promise<SheetRows[]> {
  const viaXlsx = await tryReadWithXlsx(filePath)
  if (viaXlsx) return viaXlsx
  return readWithPythonFallback(filePath)
}

function parseJobsReport(sheets: SheetRows[]) {
  console.log("[jobs_report] parsing /tmp/jobs_report.xlsx")
  const sheet = sheets.find((s) => s.name === "Sheet1") ?? sheets[0]
  if (!sheet) return { totalRevenue: 0, totalCost: 0, grossProfit: 0, grossMarginPct: 0, jobCount: 0 }

  console.log(`[jobs_report] sheet: ${sheet.name}, rows: ${sheet.rows.length}`)
  // Row 1 header, data starts row 2
  const dataRows = sheet.rows.slice(1)
  let totalRevenue = 0
  let totalCost = 0
  let jobCount = 0

  for (const row of dataRows) {
    const revenue = n(row[3] ?? null) // col D
    const labourCost = n(row[5] ?? null) // col F
    const disposalCost = n(row[6] ?? null) // col G
    const suppliesCost = n(row[7] ?? null) // col H
    const rowCost = labourCost + disposalCost + suppliesCost
    const hasAny = revenue !== 0 || labourCost !== 0 || disposalCost !== 0 || suppliesCost !== 0
    if (!hasAny) continue

    totalRevenue += revenue
    totalCost += rowCost
    jobCount += 1
  }

  const grossProfit = totalRevenue - totalCost
  const grossMarginPct = totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0

  console.log(`[jobs_report] revenue=${totalRevenue.toFixed(2)} cost=${totalCost.toFixed(2)} gp%=${grossMarginPct.toFixed(2)} jobs=${jobCount}`)

  return { totalRevenue, totalCost, grossProfit, grossMarginPct, jobCount }
}

function parseClientList(sheets: SheetRows[]) {
  console.log("[client_list] parsing /tmp/client_list_2024.xlsx")
  const sheet = sheets.find((s) => s.name.trim().toLowerCase() === "sales by customer 2024") ?? sheets[0]
  if (!sheet) return { revenueByClient: [] as RevenueRow[], top10: [] as RevenueRow[], topClient: null as RevenueRow | null }

  console.log(`[client_list] sheet: ${sheet.name}, rows: ${sheet.rows.length}`)
  // Row 5 has headers => index 4
  const rows = sheet.rows.slice(5)
  const map = new Map<string, number>()
  let currentClient = ""

  for (const row of rows) {
    const colA = t(row[0] ?? null)
    const colD = n(row[3] ?? null)
    if (!colA.trim()) continue

    const isJobLine = /^\s+/.test(colA)
    if (!isJobLine) {
      currentClient = colA.trim()
      if (!map.has(currentClient)) map.set(currentClient, 0)
      continue
    }

    if (currentClient) {
      map.set(currentClient, (map.get(currentClient) ?? 0) + colD)
    }
  }

  const revenueByClient = [...map.entries()]
    .map(([client, revenue]) => ({ client, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  const top10 = revenueByClient.slice(0, 10)
  const topClient = top10[0] ?? null
  console.log(`[client_list] clients=${revenueByClient.length} top=${topClient?.client ?? "none"}`)

  return { revenueByClient, top10, topClient }
}

function parseProduction(sheets: SheetRows[]) {
  console.log("[production] parsing /tmp/wcc_production.xlsx")
  const jobs: ProductionJob[] = []

  for (const sheet of sheets) {
    const row2 = sheet.rows[1] ?? []
    const row3 = sheet.rows[2] ?? []

    const address = t(row2[2] ?? null).trim() // row 2 col C
    const client = t(row3[2] ?? null).trim() // row 3 col C
    const contractPrice = n(row3[6] ?? null) // row 3 col G

    console.log(`[production] sheet=${sheet.name} client=${client || "(blank)"} contract=${contractPrice}`)

    if (contractPrice <= 0) continue

    jobs.push({
      sheet: sheet.name,
      client,
      address,
      contract_price: contractPrice,
    })
  }

  const totalProductionRevenue = jobs.reduce((sum, j) => sum + j.contract_price, 0)
  console.log(`[production] jobs=${jobs.length} total=${totalProductionRevenue.toFixed(2)}`)

  return { jobs, totalProductionRevenue }
}

async function main() {
  const jobsSheets = await readWorkbook(JOBS_PATH)
  const clientsSheets = await readWorkbook(CLIENTS_PATH)
  const productionSheets = await readWorkbook(PRODUCTION_PATH)

  const jobsData = parseJobsReport(jobsSheets)
  const clientData = parseClientList(clientsSheets)
  const productionData = parseProduction(productionSheets)

  const output: Financials = {
    generated_at: new Date().toISOString(),
    totals: {
      total_revenue: jobsData.totalRevenue,
      total_cost: jobsData.totalCost,
      gross_profit: jobsData.grossProfit,
      gross_margin_pct: jobsData.grossMarginPct,
      job_count: jobsData.jobCount,
    },
    clients: {
      revenue_by_client: clientData.revenueByClient,
      top_10_clients: clientData.top10,
      top_client: clientData.topClient,
    },
    production: {
      jobs: productionData.jobs,
      total_production_revenue: productionData.totalProductionRevenue,
    },
    kpis: {
      total_revenue: jobsData.totalRevenue,
      average_gp_pct: jobsData.grossMarginPct,
      top_client_by_revenue: clientData.topClient,
    },
  }

  mkdirSync(resolve(process.cwd(), "data"), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf8")

  console.log("\n=== Financials Summary ===")
  console.log(`Total Revenue: ${jobsData.totalRevenue.toFixed(2)}`)
  console.log(`GP%: ${jobsData.grossMarginPct.toFixed(2)}%`)
  console.log(`Top Client: ${clientData.topClient ? `${clientData.topClient.client} (${clientData.topClient.revenue.toFixed(2)})` : "None"}`)
  console.log(`Job Count: ${jobsData.jobCount}`)
  console.log(`Wrote ${OUT_PATH}`)
}

main().catch((err) => {
  console.error("Failed to parse financials:", err)
  process.exitCode = 1
})

import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"

type Cell = string | number | boolean | null

type SheetRows = { name: string; rows: Cell[][] }

type RevenueRow = { client: string; revenue: number }

type Financials = {
  generated_at: string
  sources: {
    jobs_report: string
    client_list: string
    production_report: string
    parser: string
  }
  totals: {
    total_revenue: number | null
    total_cost: number | null
    gross_profit: number | null
    gross_margin_pct: number | null
    job_count: number | null
  }
  clients: {
    revenue_by_client: RevenueRow[]
    top_10_clients: RevenueRow[]
    top_client: RevenueRow | null
  }
  kpis: {
    total_revenue: number | null
    average_gp_pct: number | null
    top_client_by_revenue: RevenueRow | null
  }
}

const JOBS_PATH = "/tmp/jobs_report.xlsx"
const CLIENTS_PATH = "/tmp/client_list_2024.xlsx"
const PRODUCTION_PATH = "/tmp/wcc_production.xlsx"
const OUT_PATH = resolve(process.cwd(), "data/financials.json")

function toNumber(value: Cell): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const cleaned = value.replace(/[$,%\s,()]/g, "").trim()
  if (!cleaned) return null
  const negative = value.includes("(") && value.includes(")")
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return null
  return negative ? -parsed : parsed
}

function toText(value: Cell): string {
  if (value == null) return ""
  return String(value).trim()
}

function isEmptyRow(row: Cell[]): boolean {
  return row.every((cell) => toText(cell) === "")
}

function normalizeHeader(row: Cell[]): string[] {
  return row.map((v) => toText(v).toLowerCase())
}

function hasToken(header: string, tokens: string[]): boolean {
  return tokens.some((t) => header.includes(t))
}

function pickHeaderRow(rows: Cell[][], requiredTokens: string[][]): { index: number; headers: string[] } | null {
  let best: { index: number; score: number; headers: string[] } | null = null

  rows.slice(0, 40).forEach((row, idx) => {
    const headers = normalizeHeader(row)
    const score = requiredTokens.reduce((sum, tokenGroup) => {
      return sum + (headers.some((h) => hasToken(h, tokenGroup)) ? 1 : 0)
    }, 0)

    if (score > 0 && (!best || score > best.score)) {
      best = { index: idx, score, headers }
    }
  })

  return best ? { index: best.index, headers: best.headers } : null
}

async function tryReadWithXlsx(filePath: string): Promise<SheetRows[] | null> {
  try {
    const xlsxModule = await import("xlsx")
    const xlsx = (xlsxModule as { default?: typeof import("xlsx") } & typeof import("xlsx")).default ?? xlsxModule
    const workbook = xlsx.readFile(filePath)
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name]
      const rows = xlsx.utils.sheet_to_json<Cell[]>(sheet, { header: 1, raw: true, defval: null })
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
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def col_index(ref: str) -> int:
    m = re.match(r"([A-Z]+)", ref)
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
            pieces = []
            for t in si.findall(".//main:t", NS):
                pieces.append(t.text or "")
            shared.append("".join(pieces))

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
        sheet_path = "xl/" + target
        if sheet_path not in zf.namelist():
            continue
        root = ET.fromstring(zf.read(sheet_path))
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
                    t = c.find("main:is/main:t", NS)
                    val = t.text if t is not None else None
                else:
                    v = c.find("main:v", NS)
                    text = v.text if v is not None else None
                    if text is None:
                        val = None
                    elif ctype == "s":
                        try:
                            val = shared[int(text)]
                        except Exception:
                            val = text
                    else:
                        try:
                            n = float(text)
                            val = int(n) if n.is_integer() else n
                        except Exception:
                            val = text
                vals[idx] = val
            rows.append(vals)
        out.append({"name": name, "rows": rows})

    print(json.dumps(out))
`

  const proc = spawnSync("python", ["-c", script], { encoding: "utf8" })
  if (proc.status !== 0) {
    throw new Error(proc.stderr || "Failed to parse workbook with python fallback")
  }

  const parsed = JSON.parse(proc.stdout || "[]") as SheetRows[]
  return Array.isArray(parsed) ? parsed : []
}

async function readWorkbook(filePath: string): Promise<SheetRows[]> {
  const viaXlsx = await tryReadWithXlsx(filePath)
  if (viaXlsx) return viaXlsx
  return readWithPythonFallback(filePath)
}

function aggregateJobsMetrics(sheets: SheetRows[]): { revenue: number | null; cost: number | null; grossProfit: number | null; jobCount: number | null } {
  const rows = sheets.flatMap((s) => s.rows)
  const headerMeta = pickHeaderRow(rows, [["revenue", "income", "contract"], ["cost", "expense"], ["job", "project"]])
  if (!headerMeta) return { revenue: null, cost: null, grossProfit: null, jobCount: null }

  const headers = headerMeta.headers
  const revenueIdx = headers.findIndex((h) => hasToken(h, ["revenue", "income", "contract"]))
  const costIdx = headers.findIndex((h) => hasToken(h, ["cost", "expense"]))
  const gpIdx = headers.findIndex((h) => hasToken(h, ["gross profit", "gp", "margin"]))
  const jobIdx = headers.findIndex((h) => hasToken(h, ["job", "project", "name"]))

  let revenue = 0
  let cost = 0
  let gp = 0
  let hasRevenue = false
  let hasCost = false
  let hasGp = false
  let jobCount = 0

  for (const row of rows.slice(headerMeta.index + 1)) {
    if (isEmptyRow(row)) continue
    const rev = revenueIdx >= 0 ? toNumber(row[revenueIdx] ?? null) : null
    const cst = costIdx >= 0 ? toNumber(row[costIdx] ?? null) : null
    const gpv = gpIdx >= 0 ? toNumber(row[gpIdx] ?? null) : null
    const jobName = jobIdx >= 0 ? toText(row[jobIdx] ?? null) : ""

    if (rev != null) {
      revenue += rev
      hasRevenue = true
    }
    if (cst != null) {
      cost += cst
      hasCost = true
    }
    if (gpv != null) {
      gp += gpv
      hasGp = true
    }

    if (jobName || rev != null || cst != null || gpv != null) {
      jobCount += 1
    }
  }

  return {
    revenue: hasRevenue ? revenue : null,
    cost: hasCost ? cost : null,
    grossProfit: hasGp ? gp : null,
    jobCount: jobCount > 0 ? jobCount : null,
  }
}

function aggregateClientRevenue(sheets: SheetRows[]): RevenueRow[] {
  const rows = sheets.flatMap((s) => s.rows)
  const headerMeta = pickHeaderRow(rows, [["client", "customer", "gc"], ["revenue", "sales", "amount"]])
  if (!headerMeta) return []

  const headers = headerMeta.headers
  const clientIdx = headers.findIndex((h) => hasToken(h, ["client", "customer", "gc", "name"]))
  const revenueIdx = headers.findIndex((h) => hasToken(h, ["revenue", "sales", "amount", "total"]))
  if (clientIdx < 0 || revenueIdx < 0) return []

  const map = new Map<string, number>()
  for (const row of rows.slice(headerMeta.index + 1)) {
    const client = toText(row[clientIdx] ?? null)
    const revenue = toNumber(row[revenueIdx] ?? null)
    if (!client || revenue == null) continue
    map.set(client, (map.get(client) ?? 0) + revenue)
  }

  return [...map.entries()]
    .map(([client, revenue]) => ({ client, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

function averageGpFromProduction(sheets: SheetRows[]): number | null {
  const rows = sheets.flatMap((s) => s.rows)
  const headerMeta = pickHeaderRow(rows, [["gp", "margin", "gross"], ["actual", "target", "%"]])
  if (!headerMeta) return null

  const headers = headerMeta.headers
  const gpIdx = headers.findIndex((h) => hasToken(h, ["gp %", "gross margin", "actual gp", "margin %", "gp"]))
  if (gpIdx < 0) return null

  const vals: number[] = []
  for (const row of rows.slice(headerMeta.index + 1)) {
    const n = toNumber(row[gpIdx] ?? null)
    if (n == null) continue
    vals.push(Math.abs(n) > 1 ? n : n * 100)
  }

  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

async function main() {
  const jobsSheets = await readWorkbook(JOBS_PATH)
  const clientsSheets = await readWorkbook(CLIENTS_PATH)
  const productionSheets = await readWorkbook(PRODUCTION_PATH)

  const jobs = aggregateJobsMetrics(jobsSheets)
  const revenueByClient = aggregateClientRevenue(clientsSheets)
  const top10 = revenueByClient.slice(0, 10)
  const topClient = top10[0] ?? null

  const totalRevenue = jobs.revenue
  const totalCost = jobs.cost
  const grossProfit = jobs.grossProfit ?? (jobs.revenue != null && jobs.cost != null ? jobs.revenue - jobs.cost : null)
  const grossMarginPct =
    totalRevenue != null && totalRevenue !== 0 && grossProfit != null ? (grossProfit / totalRevenue) * 100 : averageGpFromProduction(productionSheets)

  const output: Financials = {
    generated_at: new Date().toISOString(),
    sources: {
      jobs_report: JOBS_PATH,
      client_list: CLIENTS_PATH,
      production_report: PRODUCTION_PATH,
      parser: "scripts/parse-financials.ts",
    },
    totals: {
      total_revenue: totalRevenue,
      total_cost: totalCost,
      gross_profit: grossProfit,
      gross_margin_pct: grossMarginPct,
      job_count: jobs.jobCount,
    },
    clients: {
      revenue_by_client: revenueByClient,
      top_10_clients: top10,
      top_client: topClient,
    },
    kpis: {
      total_revenue: totalRevenue,
      average_gp_pct: grossMarginPct,
      top_client_by_revenue: topClient,
    },
  }

  mkdirSync(resolve(process.cwd(), "data"), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf8")
  console.log(`Wrote ${OUT_PATH}`)
}

main().catch((err) => {
  console.error("Failed to parse financials:", err)
  process.exitCode = 1
})

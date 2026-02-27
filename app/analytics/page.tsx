import { getBids, getProjects } from "@/lib/sheets"
import { formatCurrency } from "@/lib/utils"

export const dynamic = 'force-dynamic'

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
      <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "2rem", color: accent ? "var(--terra)" : "var(--ink)", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.35rem" }}>{sub}</p>}
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function Section({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "2.5rem 0 1.5rem" }}>
      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-muted)" }}>{title}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, formatted, color = "var(--terra)", sub }: {
  label: string; value: number; max: number; formatted: string; color?: string; sub?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.1rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatted}</span>
          {sub && <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>{sub}</span>}
        </div>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const [allBids, allProjects] = await Promise.all([getBids(), getProjects()])
  const bids     = allBids as any[]
  const projects = allProjects as any[]

  // ── Win rate ────────────────────────────────────────────────────────────────
  const decided    = bids.filter(b => ['won','lost'].includes(b.status))
  const won        = bids.filter(b => b.status === 'won')
  const winRate    = decided.length > 0 ? Math.round(won.length / decided.length * 100) : 0

  // ── Pipeline value ───────────────────────────────────────────────────────────
  const activePipeline = bids.filter(b => ['active','sent'].includes(b.status)).reduce((s,b) => s + b.bid_value, 0)
  const totalWonValue  = won.reduce((s,b) => s + b.bid_value, 0)
  const avgBidValue    = bids.length > 0 ? Math.round(bids.reduce((s,b) => s + b.bid_value, 0) / bids.length) : 0
  const avgWonValue    = won.length > 0 ? Math.round(totalWonValue / won.length) : 0

  // ── By client ────────────────────────────────────────────────────────────────
  const clientMap: Record<string, { name: string; bids: number; won: number; value: number; wonValue: number }> = {}
  for (const b of bids) {
    if (!clientMap[b.client]) clientMap[b.client] = { name: b.client, bids: 0, won: 0, value: 0, wonValue: 0 }
    clientMap[b.client].bids++
    clientMap[b.client].value += b.bid_value
    if (b.status === 'won') { clientMap[b.client].won++; clientMap[b.client].wonValue += b.bid_value }
  }
  const byClient = Object.values(clientMap).sort((a, b) => b.value - a.value)
  const maxClientValue = Math.max(...byClient.map(c => c.value), 1)

  // ── By status ────────────────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  for (const b of bids) statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
  const STATUS_LABELS: Record<string, string> = { active: 'Estimating', sent: 'Submitted', won: 'Won', lost: 'Lost', 'no-bid': 'No Bid' }
  const STATUS_COLORS: Record<string, string> = { active: '#4a6fa8', sent: '#c4963a', won: '#5a7a5a', lost: '#b85042', 'no-bid': '#b5afa5' }
  const maxStatusCount = Math.max(...Object.values(statusCounts), 1)

  // ── By month ─────────────────────────────────────────────────────────────────
  const monthMap: Record<string, { invited: number; won: number; value: number }> = {}
  for (const b of bids) {
    if (!b.created_at) continue
    const d = new Date(b.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleString('en-CA', { month: 'short', year: '2-digit' })
    if (!monthMap[key]) monthMap[key] = { invited: 0, won: 0, value: 0 }
    monthMap[key].invited++
    if (b.status === 'won') { monthMap[key].won++; monthMap[key].value += b.bid_value }
  }
  const byMonth = Object.entries(monthMap).sort(([a],[b]) => a.localeCompare(b)).map(([key, v]) => {
    const [y, m] = key.split('-')
    const label = new Date(Number(y), Number(m)-1, 1).toLocaleString('en-CA', { month: 'short', year: '2-digit' })
    return { label, ...v }
  })
  const maxMonthBids = Math.max(...byMonth.map(m => m.invited), 1)

  // ── Margin stats ──────────────────────────────────────────────────────────────
  const wonWithMargin = won.filter(b => b.margin_pct != null)
  const avgMargin = wonWithMargin.length > 0
    ? Math.round(wonWithMargin.reduce((s,b) => s + Number(b.margin_pct), 0) / wonWithMargin.length)
    : null

  // ── Project costs vs contract ──────────────────────────────────────────────────
  const projectStats = projects.map((p: any) => {
    const totalCosts = (p.costs as any[]).reduce((s: number, c: any) => s + c.amount, 0)
    const margin     = p.contract_value > 0 ? Math.round((p.contract_value - totalCosts) / p.contract_value * 100) : 0
    return { name: p.project_name, contract: p.contract_value, spent: totalCosts, margin }
  })
  const maxContract = Math.max(...projectStats.map((p: any) => p.contract), 1)

  // ── Historical data from WCC financial files (Dropbox) ─────────────────────
  // Source: Sales by Customer Summary — Sep 2023 to Aug 2024 (BuilderTrend export)
  const historical = {
    period: 'Sep 2023 – Aug 2024',
    revenue: 1684460.13,
    gcClients: 48,
    avgGP: 48.1,   // from 2021 Jobs Report — consistent GP target across all years
    topClients: [
      { name: 'VPAC Construction Group',        revenue: 269194.97 },
      { name: 'Alfred Horie Construction',       revenue: 188315.92 },
      { name: 'The Restorers Group',             revenue: 90476.00  },
      { name: 'Little Star Renovations',         revenue: 88837.24  },
      { name: 'Baja Construction Canada',        revenue: 85001.07  },
      { name: 'Onni Property Management',        revenue: 79818.35  },
      { name: 'Holaco Construction',             revenue: 79017.18  },
      { name: 'Terrafirma Industries',           revenue: 63836.00  },
      { name: 'PR Pomeroy Restoration',          revenue: 61500.00  },
      { name: 'Jedan Brothers Contracting',      revenue: 50726.07  },
    ],
  }
  const maxHistorical = historical.topClients[0].revenue

  return (
    <div style={{ maxWidth: "960px" }}>

      {/* 🚩 JP CALL NEEDED: analytics page fate — assess if this duplicates dashboard value or earns its keep */}

      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
          West Crow Contracting
        </p>
        <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>
          Analytics
        </h1>
      </div>

      {/* Historical baseline KPIs */}
      <Section title={`Company Baseline — ${historical.period}`} />
      <div className="kpi-grid-4" style={{ gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "1.5rem" }}>
        {[
          { label: "Annual Revenue",   value: formatCurrency(historical.revenue), sub: historical.period, accent: true },
          { label: "GC Clients",       value: String(historical.gcClients),        sub: "active relationships" },
          { label: "Avg Gross Profit", value: `${historical.avgGP}%`,              sub: "company target" },
          { label: "Top Client",       value: "$269K",                              sub: "VPAC Construction" },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{ background: "var(--bg)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.6rem", color: accent ? "var(--terra)" : "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.3rem" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Top GC clients by revenue */}
      <Section title={`Top GC Clients — ${historical.period}`} />
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 1.75rem", marginBottom: "2rem" }}>
        {historical.topClients.map(c => (
          <HBar
            key={c.name}
            label={c.name}
            value={c.revenue}
            max={maxHistorical}
            formatted={formatCurrency(c.revenue)}
            color="var(--terra)"
          />
        ))}
        <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "1rem" }}>
          Source: BuilderTrend Sales by Customer export — Sep 2023 to Aug 2024
        </p>
      </div>

      {/* KPI row */}
      <div className="kpi-grid-5" style={{ gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "0.5rem" }}>
        {[
          { label: "Total Bids",     value: String(bids.length),          sub: "all time" },
          { label: "Win Rate",       value: `${winRate}%`,                sub: `${won.length} of ${decided.length} decided`, accent: winRate < 30 },
          { label: "Active Pipeline",value: formatCurrency(activePipeline), sub: "est. + submitted" },
          { label: "Avg Bid Value",  value: formatCurrency(avgBidValue),  sub: "all bids" },
          { label: "Avg Won Value",  value: formatCurrency(avgWonValue),  sub: `${won.length} won jobs` },
        ].map(({ label, value, sub, accent }) => (
          <div key={label} style={{ background: "var(--bg)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.6rem", color: accent ? "var(--terra)" : "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.3rem" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Bids by month */}
      {byMonth.length > 0 && (
        <>
          <Section title="Bid Activity by Month" />
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 1.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", height: "120px" }}>
              {byMonth.map(m => {
                const h = Math.round((m.invited / maxMonthBids) * 100)
                return (
                  <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                    <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>{m.invited}</span>
                    <div style={{ width: "100%", position: "relative", height: `${h}%`, minHeight: 4 }}>
                      <div style={{ position: "absolute", bottom: 0, width: "100%", background: "var(--terra)", borderRadius: "3px 3px 0 0", height: "100%", opacity: 0.85 }} />
                      {m.won > 0 && (
                        <div style={{
                          position: "absolute", bottom: 0, width: "100%",
                          background: "var(--sage)", borderRadius: "3px 3px 0 0",
                          height: `${Math.round(m.won / m.invited * 100)}%`,
                        }} />
                      )}
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--ink-faint)", letterSpacing: "0.04em" }}>{m.label}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--terra)", display: "inline-block" }} />
                <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Bids received</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--sage)", display: "inline-block" }} />
                <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Won</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Status breakdown */}
      <Section title="Pipeline by Status" />
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 1.75rem" }}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <HBar
            key={status}
            label={STATUS_LABELS[status] || status}
            value={count}
            max={maxStatusCount}
            formatted={String(count)}
            sub={`bid${count !== 1 ? 's' : ''}`}
            color={STATUS_COLORS[status] || "var(--terra)"}
          />
        ))}
      </div>

      {/* Clients */}
      <Section title="Pipeline by Client" />
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 1.75rem" }}>
        {byClient.map(c => {
          const clientWinRate = c.bids > 0 ? Math.round(c.won / c.bids * 100) : 0
          return (
            <HBar
              key={c.name}
              label={c.name}
              value={c.value}
              max={maxClientValue}
              formatted={formatCurrency(c.value)}
              sub={`${c.bids} bid${c.bids !== 1 ? 's' : ''} · ${clientWinRate}% win`}
              color="var(--terra)"
            />
          )
        })}
      </div>

      {/* Win rate by client */}
      {byClient.filter(c => c.bids >= 1).length > 0 && (
        <>
          <Section title="Win Rate by Client" />
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 1.75rem" }}>
            {byClient.filter(c => c.bids >= 1).map(c => {
              const rate = Math.round(c.won / c.bids * 100)
              return (
                <HBar
                  key={c.name}
                  label={c.name}
                  value={rate}
                  max={100}
                  formatted={`${rate}%`}
                  sub={`${c.won}/${c.bids} won`}
                  color={rate >= 50 ? "var(--sage)" : rate >= 25 ? "var(--gold)" : "var(--terra)"}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Active projects */}
      {projectStats.length > 0 && (
        <>
          <Section title="Active Projects — Budget Tracking" />
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 1.75rem" }}>
            {projectStats.map((p: any) => (
              <HBar
                key={p.name}
                label={p.name}
                value={p.spent}
                max={p.contract}
                formatted={formatCurrency(p.spent)}
                sub={`of ${formatCurrency(p.contract)} · ${p.margin}% margin track`}
                color={p.margin < 20 ? "var(--terra)" : p.margin < 30 ? "var(--gold)" : "var(--sage)"}
              />
            ))}
          </div>
        </>
      )}

      {/* Margin stats */}
      {avgMargin !== null && (
        <>
          <Section title="Margin Summary" />
          <div className="kpi-grid-3" style={{ gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            {[
              { label: "Avg Margin (won)",  value: `${avgMargin}%`,               sub: `${wonWithMargin.length} bids with data` },
              { label: "Total Won Revenue", value: formatCurrency(totalWonValue),  sub: `${won.length} won jobs` },
              { label: "Highest Margin",    value: wonWithMargin.length > 0 ? `${Math.max(...wonWithMargin.map((b: any) => Number(b.margin_pct)))}%` : "—", sub: "best win" },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: "var(--bg)", padding: "1.25rem 1.5rem" }}>
                <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
                <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.6rem", color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.3rem" }}>{sub}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

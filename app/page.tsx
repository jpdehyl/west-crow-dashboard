"use client"

import { useEffect, useState } from "react"
import { formatCurrency, daysUntil } from "@/lib/utils"
import { WinRateArc } from "@/components/WinRateArc"
import Link from "next/link"

const STATUS: Record<string, { dot: string; label: string }> = {
  active:   { dot: "#3b6fa0", label: "Active" },
  sent:     { dot: "#b8860b", label: "Sent" },
  won:      { dot: "#3d8c5c", label: "Won" },
  lost:     { dot: "#c45042", label: "Lost" },
  "no-bid": { dot: "#a3a3a3", label: "No Bid" },
}

function Dot({ status }: { status: string }) {
  const s = STATUS[status] || STATUS["no-bid"]
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{s.label}</span>
    </span>
  )
}


function relativeDate(d: string): string {
  const now = new Date()
  const then = new Date(d)
  const diffMs = now.getTime() - then.getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

type RevenueClient = { client: string; revenue: number }

type FinancialAnalytics = {
  kpis?: {
    total_revenue?: number | null
    average_gp_pct?: number | null
    top_client_by_revenue?: RevenueClient | null
  }
  clients?: {
    top_10_clients?: RevenueClient[]
  }
}

type CalendarEvent = {
  title: string
  date: string
  daysUntil: number
  bucket: "critical" | "soon" | "upcoming" | "later"
  linked?: boolean
}

const BUCKETS: { key: CalendarEvent["bucket"]; emoji: string; label: string }[] = [
  { key: "critical", emoji: "🔴", label: "Critical" },
  { key: "soon",     emoji: "🟡", label: "Soon" },
  { key: "upcoming", emoji: "🟢", label: "Upcoming" },
  { key: "later",    emoji: "⚪", label: "Later" },
]

export default function DashboardPage() {
  const [financials, setFinancials] = useState<FinancialAnalytics | null>(null)
  const [bids, setBids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([])
  const [calLoading, setCalLoading] = useState(true)

  useEffect(() => {
    fetch("/api/calendar/upcoming")
      .then((r) => r.json())
      .then((data) => {
        setCalEvents(Array.isArray(data) ? data : [])
        setCalLoading(false)
      })
      .catch(() => setCalLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((payload: { data?: FinancialAnalytics }) => setFinancials(payload?.data ?? null))
      .catch(() => setFinancials(null))
  }, [])

  useEffect(() => {
    fetch("/api/bids")
      .then((r) => r.json())
      .then((data) => {
        setBids(Array.isArray(data) ? data : data.bids ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const won     = bids.filter(b => b.status === "won")
  const decided = bids.filter(b => ["won","lost"].includes(b.status))
  const winRate = decided.length > 0 ? Math.round(won.length / decided.length * 100) : 0
  const urgent = bids.filter(b => {
    const days = daysUntil(b.deadline)
    return days <= 14 && days >= 0 && !["won","lost","no-bid"].includes(b.status)
  }).sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const dateStr = new Date().toLocaleDateString("en-CA", {
    weekday: "long", month: "long", day: "numeric"
  })

  const activities: { icon: string; text: string; date: string; href: string }[] = []
  bids.forEach(bid => {
    ;(bid.timeline ?? []).forEach((ev: any) => {
      let text = ""
      if (ev.stage === "invited") text = `${bid.project_name} — bid invite received`
      else if (ev.stage === "estimating") text = `${bid.project_name} — estimation started`
      else if (ev.stage === "submitted") text = `${bid.project_name} — bid submitted`
      else if (ev.stage === "decision" && bid.status === "won") text = `${bid.project_name} — won`
      else if (ev.stage === "decision" && bid.status === "lost") text = `${bid.project_name} — lost`
      else if (ev.stage === "decision") text = `${bid.project_name} — decision made`
      if (text) {
        const icons: Record<string, string> = { invited: "📩", estimating: "📐", submitted: "📤", decision: "✅" }
        activities.push({ icon: icons[ev.stage] || "•", text, date: ev.date, href: `/bids/${bid.id}` })
      }
    })
  })
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recentActivity = activities.slice(0, 5)

  const totalRevenueKpi = financials?.kpis?.total_revenue ?? null
  const averageGpKpi = financials?.kpis?.average_gp_pct ?? null
  const topClientKpi = financials?.kpis?.top_client_by_revenue ?? null
  const statusGroups = ["active", "sent", "won", "lost", "no-bid"].map((s) => ({
    label: s === "no-bid" ? "No Bid" : s.charAt(0).toUpperCase() + s.slice(1),
    count: bids.filter((b) => b.status === s).length,
    value: bids.filter((b) => b.status === s).reduce((sum, b) => sum + (b.bid_value || 0), 0),
    color: { active: "var(--accent)", sent: "var(--gold)", won: "var(--sage)", lost: "var(--terra)", "no-bid": "var(--ink-faint)" }[s],
  }))
  const topClients = (financials?.clients?.top_10_clients ?? []).slice(0, 8)
  const maxRev = Math.max(...topClients.map((c) => c.revenue), 1)

  return (
    <div>
      <p style={{ fontSize: "13px", color: "var(--ink-faint)", fontWeight: 400, marginBottom: "1.25rem" }}>{dateStr}</p>

      {/* Bid Deadline Queue */}
      {(calLoading || calEvents.length > 0) && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
            Bid Deadline Queue
          </h2>
          {calLoading && [...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 32, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
          {!calLoading && BUCKETS.map(({ key, emoji, label }) => {
            const items = calEvents.filter(e => e.bucket === key)
            if (items.length === 0) return null
            return (
              <div key={key} style={{ marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.35rem" }}>
                  {emoji} {label}
                </p>
                {items.map((ev, i) => (
                  <div key={`${ev.title}-${ev.date}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.4rem 0",
                    borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {ev.title}
                    </span>
                    {ev.linked === false && (
                      <span style={{
                        fontSize: "10px", fontWeight: 700, color: "var(--gold)",
                        background: "var(--gold-light)", padding: "1px 5px",
                        borderRadius: "4px", flexShrink: 0, marginLeft: "0.4rem",
                        whiteSpace: "nowrap",
                      }}>
                        ⚠ Unlinked
                      </span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0, marginLeft: "0.75rem" }}>
                      <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>
                        {new Date(ev.date + "T12:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </span>
                      <span style={{
                        fontSize: "11px", fontWeight: 600, minWidth: "2.2rem", textAlign: "center",
                        color: key === "critical" ? "var(--terra)" : key === "soon" ? "var(--gold)" : "var(--ink-muted)",
                        background: key === "critical" ? "var(--terra-light)" : key === "soon" ? "var(--gold-light)" : "var(--border)",
                        padding: "2px 6px", borderRadius: "4px",
                      }}>
                        {ev.daysUntil === 0 ? "today" : `${ev.daysUntil}d`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <div className="kpi-grid" style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
          display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500 }}>Total Revenue</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>
            {totalRevenueKpi != null ? formatCurrency(totalRevenueKpi) : "—"}
          </p>
          <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>from jobs ledger</p>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
        }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.35rem" }}>Average GP%</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{averageGpKpi != null ? `${Math.round(averageGpKpi * 10) / 10}%` : "—"}</p>
          <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>across parsed financials</p>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
        }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.35rem" }}>Top Client</p>
          <p style={{ fontSize: "1.35rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{topClientKpi?.client ?? "—"}</p>
          <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>{topClientKpi?.revenue != null ? formatCurrency(topClientKpi.revenue) : "no revenue data"}</p>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <WinRateArc pct={winRate} />
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.35rem" }}>Win Rate</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{winRate}%</p>
            <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>{won.length}/{decided.length} decided</p>
          </div>
        </div>
      </div>

      <div className="content-grid" style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "start" }}>
        {loading && (
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              Due Soon
            </h2>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 36, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        )}

        {!loading && urgent.length > 0 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              Due Soon
            </h2>
            {urgent.map((bid, i) => {
              const days = daysUntil(bid.deadline)
              const isLast = i === urgent.length - 1
              return (
                <Link key={bid.id} href={`/bids/${bid.id}`}
                  className="row-hover"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.55rem 0", textDecoration: "none",
                    borderBottom: isLast ? "none" : "1px solid var(--border)",
                  }}>
                  <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{bid.project_name}</span>
                    <span style={{ fontSize: "12px", color: "var(--ink-faint)", marginLeft: "0.4rem" }}>{bid.client}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 600, minWidth: "2rem", textAlign: "center",
                      color: days <= 5 ? "var(--terra)" : "var(--gold)",
                      background: days <= 5 ? "var(--terra-light)" : "var(--gold-light)",
                      padding: "2px 6px", borderRadius: "4px",
                    }}>{days}d</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>
                      {formatCurrency(bid.bid_value)}
                    </span>
                    <Dot status={bid.status} />
                  </div>
                </Link>
              )
            })}
            <div style={{ marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
              <Link href="/bids" style={{ fontSize: "12px", color: "var(--ink-muted)", textDecoration: "none", fontWeight: 500 }}>
                View pipeline →
              </Link>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
            Recent Activity
          </h2>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 28, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {!loading && recentActivity.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
            Recent Activity
          </h2>
          {recentActivity.map((item, i) => (
            <Link key={`${item.href}-${item.date}-${i}`} href={item.href}
              className="row-hover"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.45rem 0", textDecoration: "none",
                borderBottom: i < recentActivity.length - 1 ? "1px solid var(--border)" : "none",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 400 }}>{item.text}</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--ink-faint)", whiteSpace: "nowrap", marginLeft: "0.75rem" }}>
                {relativeDate(item.date)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <section style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", fontWeight: 600, marginBottom: "0.75rem" }}>
            Pipeline by Status
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {statusGroups.map((status) => (
              <div
                key={status.label}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  flex: "1 1 160px",
                  minWidth: 0,
                }}
              >
                <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{status.label}</span>
                </p>
                <p className="kpi-value" style={{ fontSize: "1.4rem", lineHeight: 1, color: "var(--ink)", marginBottom: "0.2rem" }}>{status.count}</p>
                <p style={{ fontSize: "11px", color: "var(--ink-faint)" }}>{formatCurrency(status.value)}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", fontWeight: 600, marginBottom: "0.75rem" }}>
            Top Clients by Revenue
          </h2>

          {!financials && [...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 28, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}

          {financials && topClients.map((client) => (
            <div key={client.client} style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", gap: "0.75rem" }}>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>{client.client}</span>
                <span className="kpi-value" style={{ fontSize: "1rem", color: "var(--ink)", whiteSpace: "nowrap" }}>
                  {formatCurrency(client.revenue)}
                </span>
              </div>
              <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(client.revenue / maxRev) * 100}%`,
                    background: "var(--sage)",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

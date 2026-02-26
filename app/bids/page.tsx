"use client"
import { useState, useEffect } from "react"
import { formatCurrency, formatDate, daysUntil, STATUS_COLOR } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import Link from "next/link"

type BidStatus = 'active' | 'sent' | 'won' | 'lost' | 'no-bid'

const STAGES: { key: BidStatus; label: string }[] = [
  { key: 'active',   label: 'Estimating' },
  { key: 'sent',     label: 'Submitted' },
  { key: 'won',      label: 'Won' },
  { key: 'lost',     label: 'Lost' },
  { key: 'no-bid',   label: 'No Bid' },
]

const BOARD_COLUMNS = [
  { key: 'estimating', statuses: ['active'],        label: 'Estimating', color: '#4a6fa8' },
  { key: 'submitted',  statuses: ['sent'],          label: 'Submitted',  color: '#c4963a' },
  { key: 'won',        statuses: ['won'],           label: 'Won',        color: '#5a7a5a' },
  { key: 'closed',     statuses: ['lost','no-bid'], label: 'Closed',     color: '#b5afa5' },
]

export default function PipelinePage() {
  const [view, setView]   = useState<'list' | 'board'>('list')
  const [bids, setBids]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bids')
      .then(r => r.json())
      .then(data => { setBids(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const sorted   = [...bids].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  const pipeline = bids.filter(b => b.status === 'active' || b.status === 'sent').reduce((s, b) => s + b.bid_value, 0)

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2.5rem" }}>
        <div>
          <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
            {loading ? "Loading…" : `${bids.length} bids · ${formatCurrency(pipeline)} in pipeline`}
          </p>
          <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>
            Pipeline
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {(['list','board'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "0.45rem 1rem", fontSize: "12px", fontWeight: 500,
                background: view === v ? "var(--ink)" : "transparent",
                color: view === v ? "var(--bg)" : "var(--ink-muted)",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "0.02em", transition: "background 0.12s, color 0.12s",
              }}>
                {v === 'list' ? '≡  List' : '⊞  Board'}
              </button>
            ))}
          </div>
          <Link href="/bids/new" style={{ padding: "0.6rem 1.25rem", background: "var(--ink)", color: "var(--bg)", borderRadius: "8px", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
            + New Bid
          </Link>
        </div>
      </div>

      {/* Stage summary strip */}
      <div style={{ display: "flex", gap: "0", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", marginBottom: "2rem" }}>
        {STAGES.map(({ key, label }, i) => {
          const count = bids.filter(b => b.status === key).length
          const val   = bids.filter(b => b.status === key).reduce((s, b) => s + b.bid_value, 0)
          return (
            <div key={key} style={{ flex: 1, padding: "1rem 1.25rem", background: "var(--bg)", borderRight: i < STAGES.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[key], display: "inline-block" }} />
                <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500 }}>{label}</span>
              </div>
              <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.5rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
                {loading ? "—" : count}
              </p>
              {val > 0 && <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.2rem" }}>{formatCurrency(val)}</p>}
            </div>
          )
        })}
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--ink-faint)", fontSize: "13px" }}>
          Loading pipeline…
        </div>
      ) : view === 'list' ? (

        /* LIST VIEW */
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr>
                {[["Project","left"],["Client","left"],["Value","right"],["Deadline","left"],["Stage","left"],["Est.","left"],["Margin","right"]].map(([h, a]) => (
                  <th key={h} style={{ textAlign: a as "left"|"right", padding: "0.7rem 1.5rem", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((bid, i) => {
                const days   = daysUntil(bid.deadline)
                const urgent = days <= 7 && !['won','lost','no-bid'].includes(bid.status)
                const border = i < sorted.length - 1 ? "1px solid var(--border)" : "none"
                return (
                  <tr key={bid.id} className="row-hover">
                    <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
                      <Link href={`/bids/${bid.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>{bid.project_name}</Link>
                    </td>
                    <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{bid.client}</td>
                    <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, textAlign: "right", fontWeight: 500, fontFamily: "var(--font-serif), serif", whiteSpace: "nowrap" }}>
                      {formatCurrency(bid.bid_value)}
                    </td>
                    <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
                      <span style={{ color: urgent ? "var(--terra)" : "var(--ink-muted)" }}>{formatDate(bid.deadline)}</span>
                      {urgent && <span style={{ marginLeft: "0.4rem", fontSize: "11px", background: "var(--terra-light)", color: "var(--terra)", padding: "1px 5px", borderRadius: "4px", fontWeight: 500 }}>{days}d</span>}
                    </td>
                    <td style={{ padding: "0.9rem 1.5rem", borderBottom: border }}><StatusDot status={bid.status} /></td>
                    <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{bid.estimator}</td>
                    <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, textAlign: "right", color: bid.margin_pct ? "var(--sage)" : "var(--ink-faint)", whiteSpace: "nowrap" }}>
                      {bid.margin_pct != null ? `${bid.margin_pct}%` : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      ) : (

        /* BOARD VIEW */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", alignItems: "start" }}>
          {BOARD_COLUMNS.map(col => {
            const colBids  = bids.filter(b => col.statuses.includes(b.status)).sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            const colValue = colBids.reduce((s, b) => s + b.bid_value, 0)
            return (
              <div key={col.key}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)" }}>{col.label}</span>
                  <span style={{ fontSize: "11px", color: "var(--ink-faint)", marginLeft: "auto" }}>{colBids.length}</span>
                </div>
                {colValue > 0 && <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginBottom: "0.75rem", padding: "0 0.25rem" }}>{formatCurrency(colValue)}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {colBids.length === 0 ? (
                    <div style={{ padding: "1.5rem", border: "1px dashed var(--border)", borderRadius: "10px", textAlign: "center", color: "var(--ink-faint)", fontSize: "12px" }}>None</div>
                  ) : colBids.map(bid => {
                    const days   = daysUntil(bid.deadline)
                    const urgent = days <= 7 && !['won','lost','no-bid'].includes(bid.status)
                    return (
                      <Link key={bid.id} href={`/bids/${bid.id}`} style={{ textDecoration: "none" }}>
                        <div className="row-hover" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.1rem", cursor: "pointer", borderTop: `3px solid ${col.color}` }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "0.3rem", lineHeight: 1.3 }}>{bid.project_name}</p>
                          <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginBottom: "0.85rem" }}>{bid.client}</p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "var(--font-serif), serif", fontSize: "1rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatCurrency(bid.bid_value)}</span>
                            {urgent ? (
                              <span style={{ fontSize: "11px", background: "var(--terra-light)", color: "var(--terra)", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>{days}d</span>
                            ) : (
                              <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>{formatDate(bid.deadline)}</span>
                            )}
                          </div>
                          {bid.margin_pct != null && (
                            <div style={{ marginTop: "0.5rem", fontSize: "11px", color: "var(--sage)", fontWeight: 500 }}>{bid.margin_pct}% margin ✓</div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

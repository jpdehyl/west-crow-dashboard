import { BIDS, BidStatus } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil, statusLabel, STATUS_COLOR } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import Link from "next/link"

const STAGES: { key: BidStatus; label: string }[] = [
  { key: 'active',   label: 'Estimating' },
  { key: 'sent',     label: 'Submitted' },
  { key: 'won',      label: 'Won' },
  { key: 'lost',     label: 'Lost' },
  { key: 'no-bid',   label: 'No Bid' },
]

export default function PipelinePage() {
  const sorted = [...BIDS].sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  const pipeline = BIDS.filter(b => b.status === 'active' || b.status === 'sent').reduce((s,b) => s + b.bid_value, 0)

  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2.5rem" }}>
        <div>
          <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
            {BIDS.length} bids · {formatCurrency(pipeline)} in pipeline
          </p>
          <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>Pipeline</h1>
        </div>
        <Link href="/bids/new" style={{ padding: "0.6rem 1.25rem", background: "var(--ink)", color: "var(--bg)", borderRadius: "8px", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
          + New Bid
        </Link>
      </div>

      {/* Stage Summary */}
      <div style={{ display: "flex", gap: "0", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", marginBottom: "2rem" }}>
        {STAGES.map(({ key, label }, i) => {
          const count = BIDS.filter(b => b.status === key).length
          const val = BIDS.filter(b => b.status === key).reduce((s,b) => s + b.bid_value, 0)
          return (
            <div key={key} style={{ flex: 1, padding: "1rem 1.25rem", background: "var(--bg)", borderRight: i < STAGES.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[key], display: "inline-block" }} />
                <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500 }}>{label}</span>
              </div>
              <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.5rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{count}</p>
              {val > 0 && <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.2rem" }}>{formatCurrency(val)}</p>}
            </div>
          )
        })}
      </div>

      {/* Table */}
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
              const days = daysUntil(bid.deadline)
              const urgent = days <= 7 && !['won','lost','no-bid'].includes(bid.status)
              const border = i < sorted.length - 1 ? "1px solid var(--border)" : "none"
              return (
                <tr key={bid.id} className="row-hover">
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
                    <Link href={`/bids/${bid.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>{bid.project_name}</Link>
                  </td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{bid.client}</td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, textAlign: "right", fontWeight: 500, fontFamily: "var(--font-serif), serif", whiteSpace: "nowrap" }}>{formatCurrency(bid.bid_value)}</td>
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
    </div>
  )
}

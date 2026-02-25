import { BIDS } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils"
import Link from "next/link"

const STATUS: Record<string, { dot: string; label: string }> = {
  active:   { dot: "#4a6fa8", label: "Active" },
  sent:     { dot: "#c4963a", label: "Sent" },
  won:      { dot: "#5a7a5a", label: "Won" },
  lost:     { dot: "#b85042", label: "Lost" },
  "no-bid": { dot: "#b5afa5", label: "No Bid" },
}

function Dot({ status }: { status: string }) {
  const s = STATUS[status] || STATUS["no-bid"]
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      <span style={{ color: "var(--ink-muted)", fontSize: "13px" }}>{s.label}</span>
    </span>
  )
}

export default function DashboardPage() {
  const active = BIDS.filter(b => b.status === "active")
  const sent   = BIDS.filter(b => b.status === "sent")
  const won    = BIDS.filter(b => b.status === "won")
  const decided = BIDS.filter(b => ["won","lost"].includes(b.status))
  const winRate  = decided.length > 0 ? Math.round(won.length / decided.length * 100) : 0
  const pipeline = [...active, ...sent].reduce((s, b) => s + b.bid_value, 0)

  const sorted = [...BIDS].sort((a, b) => {
    const aFinal = ["won","lost","no-bid"].includes(a.status)
    const bFinal = ["won","lost","no-bid"].includes(b.status)
    if (aFinal !== bFinal) return aFinal ? 1 : -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  return (
    <div style={{ maxWidth: "960px" }}>

      {/* Header */}
      <div style={{ marginBottom: "3rem" }}>
        <p style={{
          fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem"
        }}>
          {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 style={{
          fontFamily: "var(--font-serif), serif",
          fontSize: "2.75rem", fontWeight: 400,
          letterSpacing: "-0.03em", lineHeight: 1,
          color: "var(--ink)",
        }}>Bid Pipeline</h1>
      </div>

      {/* KPIs — clean row, no card borders */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        marginBottom: "3rem",
      }}>
        {[
          { label: "Pipeline Value", value: formatCurrency(pipeline), note: `${active.length + sent.length} open bids` },
          { label: "Active",         value: String(active.length),    note: "in estimation" },
          { label: "Awaiting",       value: String(sent.length),      note: "decision pending" },
          { label: "Win Rate",       value: `${winRate}%`,            note: `${won.length}/${decided.length} decided` },
        ].map(({ label, value, note }, i, arr) => (
          <div key={label} style={{
            padding: "1.75rem 1.5rem",
            borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <p style={{
              fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem"
            }}>{label}</p>
            <p style={{
              fontFamily: "var(--font-serif), serif",
              fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em",
              color: "var(--ink)", lineHeight: 1, marginBottom: "0.4rem"
            }}>{value}</p>
            <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{note}</p>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{
          fontSize: "13px", fontWeight: 500, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "var(--ink-muted)"
        }}>Open Bids</h2>
        <Link href="/bids" style={{ fontSize: "12px", color: "var(--terra)", textDecoration: "none" }}>
          All bids →
        </Link>
      </div>

      {/* Table */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {sorted.map((bid, i) => {
          const days = daysUntil(bid.deadline)
          const urgent = days <= 7 && !["won","lost","no-bid"].includes(bid.status)
          return (
            <Link key={bid.id} href={`/bids/${bid.id}`}
              className="row-hover"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                gap: "0 2rem",
                alignItems: "center",
                padding: "1rem 0.5rem",
                borderBottom: "1px solid var(--border)",
                textDecoration: "none",
              }}>
              {/* Name + client */}
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "0.2rem" }}>
                  {bid.project_name}
                </p>
                <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{bid.client}</p>
              </div>
              {/* Value */}
              <p style={{
                fontFamily: "var(--font-serif), serif",
                fontSize: "16px", color: "var(--ink)", whiteSpace: "nowrap"
              }}>{formatCurrency(bid.bid_value)}</p>
              {/* Deadline */}
              <p style={{ fontSize: "13px", color: urgent ? "var(--terra)" : "var(--ink-muted)", whiteSpace: "nowrap" }}>
                {formatDate(bid.deadline)}
                {urgent && <span style={{
                  marginLeft: "0.4rem", fontSize: "11px",
                  background: "var(--terra-light)", color: "var(--terra)",
                  padding: "1px 5px", borderRadius: "4px", fontWeight: 500
                }}>{days}d</span>}
              </p>
              {/* Status */}
              <Dot status={bid.status} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{s.label}</span>
    </span>
  )
}

export default function DashboardPage() {
  const active  = BIDS.filter(b => b.status === "active")
  const sent    = BIDS.filter(b => b.status === "sent")
  const won     = BIDS.filter(b => b.status === "won")
  const decided = BIDS.filter(b => ["won","lost"].includes(b.status))
  const winRate = decided.length > 0 ? Math.round(won.length / decided.length * 100) : 0
  const pipeline = [...active, ...sent].reduce((s, b) => s + b.bid_value, 0)

  const urgent = BIDS.filter(b => {
    const days = daysUntil(b.deadline)
    return days <= 14 && days >= 0 && !["won","lost","no-bid"].includes(b.status)
  }).sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const recent = [...BIDS]
    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const dateStr = new Date().toLocaleDateString("en-CA", {
    weekday: "long", month: "long", day: "numeric"
  })

  const headline = pipeline > 0
    ? `${formatCurrency(pipeline)} in active pipeline`
    : "No active bids right now"
  const subline = urgent.length > 0
    ? `${urgent.length} bid${urgent.length > 1 ? "s" : ""} due in the next 14 days`
    : "No urgent deadlines"

  return (
    <div style={{ maxWidth: "960px", marginLeft: "-3rem", marginRight: "-3rem", marginTop: "-2.5rem" }}>

      {/* ── HERO ── */}
      <div style={{
        position: "relative",
        height: "340px",
        backgroundImage: `url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80')`,
        backgroundSize: "cover",
        backgroundPosition: "center 40%",
        overflow: "hidden",
      }}>
        {/* Gradient overlay: dark at top edges, fades to warm white at bottom */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 40%, rgba(255,253,248,0.85) 80%, rgba(255,253,248,1) 100%)",
        }} />

        {/* Hero text — sits low in the image */}
        <div style={{
          position: "absolute", bottom: "2.5rem", left: "3rem", right: "3rem",
        }}>
          <p style={{
            fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)", fontWeight: 500, marginBottom: "0.6rem",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}>{dateStr}</p>
          <h1 style={{
            fontFamily: "var(--font-serif), serif",
            fontSize: "2.75rem", fontWeight: 400,
            letterSpacing: "-0.03em", lineHeight: 1.05,
            color: "#fff",
            textShadow: "0 2px 12px rgba(0,0,0,0.25)",
            marginBottom: "0.5rem",
          }}>{headline}</h1>
          <p style={{
            fontSize: "15px", color: "rgba(255,255,255,0.8)",
            textShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}>{subline}</p>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "2.5rem 3rem" }}>

        {/* KPIs */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          border: "1px solid var(--border)", borderRadius: "12px",
          overflow: "hidden", marginBottom: "3rem",
        }}>
          {[
            { label: "Pipeline",   value: formatCurrency(pipeline),    note: `${active.length + sent.length} open` },
            { label: "Active",     value: String(active.length),       note: "in estimation" },
            { label: "Awaiting",   value: String(sent.length),         note: "pending decision" },
            { label: "Win Rate",   value: `${winRate}%`,               note: `${won.length}/${decided.length} decided` },
          ].map(({ label, value, note }, i, arr) => (
            <div key={label} style={{
              padding: "1.5rem 1.75rem",
              background: "var(--bg)",
              borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.6rem" }}>{label}</p>
              <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "2rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1, marginBottom: "0.35rem" }}>{value}</p>
              <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{note}</p>
            </div>
          ))}
        </div>

        {/* Urgent bids */}
        {urgent.length > 0 && (
          <div style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "1rem" }}>
              Due in 14 days
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {urgent.map((bid, i) => {
                const days = daysUntil(bid.deadline)
                const isLast = i === urgent.length - 1
                return (
                  <Link key={bid.id} href={`/bids/${bid.id}`}
                    className="row-hover"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.9rem 0", textDecoration: "none",
                      borderBottom: isLast ? "none" : "1px solid var(--border)",
                    }}>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>{bid.project_name}</span>
                      <span style={{ fontSize: "13px", color: "var(--ink-faint)", marginLeft: "0.75rem" }}>{bid.client}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                      <span style={{
                        fontSize: "12px", fontWeight: 600,
                        color: days <= 5 ? "var(--terra)" : "var(--gold)",
                        background: days <= 5 ? "var(--terra-light)" : "var(--gold-light)",
                        padding: "3px 8px", borderRadius: "5px"
                      }}>{days}d</span>
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-serif), serif" }}>
                        {formatCurrency(bid.bid_value)}
                      </span>
                      <Dot status={bid.status} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)", marginBottom: "3rem" }} />

        {/* Recent activity */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
              Recent Bids
            </h2>
            <Link href="/bids" style={{ fontSize: "12px", color: "var(--terra)", textDecoration: "none" }}>All bids →</Link>
          </div>
          <div>
            {recent.map((bid, i) => (
              <Link key={bid.id} href={`/bids/${bid.id}`}
                className="row-hover"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.85rem 0", textDecoration: "none",
                  borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>{bid.project_name}</span>
                  <span style={{ fontSize: "13px", color: "var(--ink-faint)", marginLeft: "0.75rem" }}>{bid.client}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <span style={{ fontSize: "13px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{formatDate(bid.deadline)}</span>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-serif), serif", whiteSpace: "nowrap" }}>
                    {formatCurrency(bid.bid_value)}
                  </span>
                  <Dot status={bid.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

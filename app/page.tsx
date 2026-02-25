import { BIDS } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils"
import Link from "next/link"

const STATUS_DOT: Record<string, string> = {
  active: "#3a6ea8",
  sent: "#c17f3a",
  won: "#3a8a5a",
  lost: "#c0392b",
  "no-bid": "#a0a09a",
}
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  sent: "Sent",
  won: "Won",
  lost: "Lost",
  "no-bid": "No Bid",
}

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: STATUS_DOT[status] || "#ccc",
        display: "inline-block", flexShrink: 0,
      }} />
      <span style={{ color: "var(--ink-muted)", fontSize: "13px" }}>{STATUS_LABEL[status]}</span>
    </span>
  )
}

export default function DashboardPage() {
  const active = BIDS.filter(b => b.status === "active")
  const sent = BIDS.filter(b => b.status === "sent")
  const won = BIDS.filter(b => b.status === "won")
  const decided = BIDS.filter(b => b.status === "won" || b.status === "lost")
  const winRate = decided.length > 0 ? Math.round((won.length / decided.length) * 100) : 0
  const pipeline = [...active, ...sent].reduce((s, b) => s + b.bid_value, 0)

  const kpis = [
    { label: "Pipeline Value", value: formatCurrency(pipeline), sub: `${active.length + sent.length} active bids` },
    { label: "Active", value: String(active.length), sub: "in estimation" },
    { label: "Sent", value: String(sent.length), sub: "awaiting decision" },
    { label: "Win Rate", value: `${winRate}%`, sub: `${won.length} of ${decided.length} decided` },
  ]

  const sorted = [...BIDS].sort((a, b) =>
    a.status === "won" || a.status === "lost" || a.status === "no-bid" ? 1 :
    b.status === "won" || b.status === "lost" || b.status === "no-bid" ? -1 :
    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  )

  const today = new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{
          fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
          color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem"
        }}>{today}</div>
        <h1 style={{
          fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.03em",
          color: "var(--ink)", lineHeight: 1.1
        }}>Bid Pipeline</h1>
      </div>

      {/* KPI Row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "1px", background: "var(--cream-dark)",
        border: "1px solid var(--cream-dark)", borderRadius: "12px",
        overflow: "hidden", marginBottom: "2.5rem"
      }}>
        {kpis.map(({ label, value, sub }) => (
          <div key={label} style={{
            background: "var(--cream)",
            padding: "1.5rem 1.75rem",
          }}>
            <div style={{
              fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.6rem"
            }}>{label}</div>
            <div style={{
              fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.03em",
              color: "var(--ink)", lineHeight: 1, marginBottom: "0.4rem",
              fontFamily: "var(--font-serif), serif"
            }}>{value}</div>
            <div style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Bids Table */}
      <div style={{
        background: "var(--cream)", border: "1px solid var(--cream-dark)",
        borderRadius: "12px", overflow: "hidden"
      }}>
        <div style={{
          padding: "1.25rem 1.75rem",
          borderBottom: "1px solid var(--cream-dark)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            Active Bids
          </span>
          <Link href="/bids" style={{
            fontSize: "12px", color: "var(--ink-faint)",
            textDecoration: "none", letterSpacing: "0.01em"
          }}>View all →</Link>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr>
              {["Project", "Client", "Value", "Deadline", "Status"].map(h => (
                <th key={h} style={{
                  textAlign: h === "Value" ? "right" : "left",
                  padding: "0.75rem 1.75rem",
                  fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--ink-faint)", fontWeight: 500, whiteSpace: "nowrap",
                  borderBottom: "1px solid var(--cream-dark)"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((bid, i) => {
              const days = daysUntil(bid.deadline)
              const urgent = days <= 7 && !["won","lost","no-bid"].includes(bid.status)
              const rowBorder = i < sorted.length - 1 ? "1px solid var(--cream-dark)" : "none"
              return (
                <tr key={bid.id} className="bid-row"
                  
                  >
                  <td style={{ padding: "1rem 1.75rem", borderBottom: rowBorder, whiteSpace: "nowrap" }}>
                    <Link href={`/bids/${bid.id}`} style={{
                      color: "var(--ink)", textDecoration: "none",
                      fontWeight: 500, fontSize: "14px"
                    }}>{bid.project_name}</Link>
                  </td>
                  <td style={{ padding: "1rem 1.75rem", borderBottom: rowBorder, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                    {bid.client}
                  </td>
                  <td style={{ padding: "1rem 1.75rem", borderBottom: rowBorder, textAlign: "right", fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>
                    {formatCurrency(bid.bid_value)}
                  </td>
                  <td style={{ padding: "1rem 1.75rem", borderBottom: rowBorder, whiteSpace: "nowrap" }}>
                    <span style={{ color: urgent ? "var(--amber)" : "var(--ink-muted)" }}>
                      {formatDate(bid.deadline)}
                    </span>
                    {urgent && (
                      <span style={{
                        marginLeft: "0.5rem", fontSize: "11px",
                        background: "var(--amber-light)", color: "var(--amber)",
                        padding: "1px 6px", borderRadius: "4px", fontWeight: 500
                      }}>{days}d</span>
                    )}
                  </td>
                  <td style={{ padding: "1rem 1.75rem", borderBottom: rowBorder }}>
                    <StatusDot status={bid.status} />
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

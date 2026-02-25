import { BIDS } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils"
import Link from "next/link"

const STATUS_DOT: Record<string, string> = {
  active: "#3a6ea8", sent: "#c17f3a", won: "#3a8a5a", lost: "#c0392b", "no-bid": "#a0a09a",
}
const STATUS_LABEL: Record<string, string> = {
  active: "Active", sent: "Sent", won: "Won", lost: "Lost", "no-bid": "No Bid",
}

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT[status] || "#ccc", display: "inline-block" }} />
      <span style={{ color: "var(--ink-muted)", fontSize: "13px" }}>{STATUS_LABEL[status]}</span>
    </span>
  )
}

export default function BidsPage() {
  const sorted = [...BIDS].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  return (
    <div style={{ maxWidth: "1100px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2.5rem" }}>
        <div>
          <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
            {BIDS.length} bids total
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--ink)" }}>All Bids</h1>
        </div>
        <Link href="/bids/new" style={{
          padding: "0.6rem 1.25rem", background: "var(--ink)", color: "var(--cream)",
          borderRadius: "8px", fontSize: "13px", fontWeight: 500, textDecoration: "none",
          letterSpacing: "0.01em"
        }}>+ New Bid</Link>
      </div>

      <div style={{ background: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr>
              {[["Project","left"],["Client","left"],["Value","right"],["Deadline","left"],["Estimator","left"],["Margin","right"],["Status","left"]].map(([h, align]) => (
                <th key={h} style={{
                  textAlign: align as "left" | "right", padding: "0.75rem 1.5rem",
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
              const border = i < sorted.length - 1 ? "1px solid var(--cream-dark)" : "none"
              return (
                <tr key={bid.id} className="bid-row"
                  
                  >
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
                    <Link href={`/bids/${bid.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>
                      {bid.project_name}
                    </Link>
                  </td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{bid.client}</td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, textAlign: "right", fontWeight: 500, whiteSpace: "nowrap" }}>{formatCurrency(bid.bid_value)}</td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
                    <span style={{ color: urgent ? "var(--amber)" : "var(--ink-muted)" }}>{formatDate(bid.deadline)}</span>
                    {urgent && <span style={{ marginLeft: "0.4rem", fontSize: "11px", background: "var(--amber-light)", color: "var(--amber)", padding: "1px 5px", borderRadius: "4px" }}>{days}d</span>}
                  </td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{bid.estimator}</td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, textAlign: "right", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                    {bid.margin_pct != null ? `${bid.margin_pct}%` : "—"}
                  </td>
                  <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
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

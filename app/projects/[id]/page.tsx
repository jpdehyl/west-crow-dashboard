import { PROJECTS, BIDS } from "@/lib/data"
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"

const COST_COLORS: Record<string, string> = {
  labour: "#4a6fa8", materials: "#c4963a", equipment: "#7a5a8a", subcontractor: "#5a7a5a", other: "#b5afa5"
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = PROJECTS.find(p => p.id === params.id)
  if (!project) notFound()
  const bid = BIDS.find(b => b.id === project.bid_id)

  const totalCosts = project.costs.reduce((s,c) => s + c.amount, 0)
  const budgetTotal = project.budget_labour + project.budget_materials + project.budget_subs
  const margin = Math.round(((project.contract_value - totalCosts) / project.contract_value) * 100)
  const budgetPct = Math.round((totalCosts / budgetTotal) * 100)

  const costsByCategory = project.costs.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + c.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ maxWidth: "960px" }}>
      <Link href="/projects" style={{ fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.75rem" }}>
        ← Projects
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: "0.4rem" }}>
            {project.project_name}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)" }}>
            {project.client} · {formatDate(project.start_date)} → {formatDate(project.end_date)} · {project.estimator}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.75rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatCurrency(project.contract_value)}</p>
          <p style={{ fontSize: "12px", color: "var(--sage)", fontWeight: 500 }}>Active</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginBottom: "2.5rem" }}>
        {[
          { label: "Contract",      value: formatCurrency(project.contract_value),  sub: "agreed value" },
          { label: "Spent to Date", value: formatCurrency(totalCosts),              sub: `${budgetPct}% of budget`, warn: budgetPct > 85 },
          { label: "Margin Track",  value: `${margin}%`,                            sub: "on current costs", warn: margin < 20 },
          { label: "Daily Logs",    value: String(project.daily_logs.length),       sub: "entries so far" },
        ].map(({ label, value, sub, warn }) => (
          <div key={label} style={{ background: "var(--bg)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>{label}</p>
            <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.6rem", color: warn ? "var(--terra)" : "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "11px", color: warn ? "var(--terra)" : "var(--ink-faint)", marginTop: "0.3rem" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Daily Logs */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 500 }}>Daily Logs</p>
          <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>via BuilderTrend</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          {project.daily_logs.map((log, i) => (
            <div key={log.id} style={{ padding: "1.25rem 1.5rem", background: "var(--bg)", borderBottom: i < project.daily_logs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{formatDateShort(log.date)}</p>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{log.hours} hrs</span>
                  {log.weather && <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{log.weather}</span>}
                </div>
              </div>
              <p style={{ fontSize: "13px", color: "var(--ink-muted)", lineHeight: 1.6, marginBottom: "0.4rem" }}>{log.work_performed}</p>
              <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{log.crew.join(" · ")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Costs */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 500 }}>Costs</p>
          <span style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.1rem", color: "var(--ink)" }}>{formatCurrency(totalCosts)} total</span>
        </div>

        {/* Cost breakdown pills */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {Object.entries(costsByCategory).map(([cat, amt]) => (
            <span key={cat} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--ink-muted)", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: COST_COLORS[cat] || "#ccc", display: "inline-block" }} />
              {cat} · {formatCurrency(amt)}
            </span>
          ))}
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Date","Description","Category","Vendor","Amount"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 4 ? "right" : "left", padding: "0.65rem 1.25rem", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {project.costs.map((cost, i) => (
                <tr key={cost.id} className="row-hover">
                  <td style={{ padding: "0.8rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{formatDateShort(cost.date)}</td>
                  <td style={{ padding: "0.8rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", color: "var(--ink)", fontWeight: 500 }}>{cost.description}</td>
                  <td style={{ padding: "0.8rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "12px", color: "var(--ink-muted)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: COST_COLORS[cost.category] || "#ccc", display: "inline-block" }} />
                      {cost.category}
                    </span>
                  </td>
                  <td style={{ padding: "0.8rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", color: "var(--ink-faint)" }}>{cost.vendor || "—"}</td>
                  <td style={{ padding: "0.8rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", textAlign: "right", fontWeight: 500, fontFamily: "var(--font-serif), serif", color: "var(--ink)" }}>{formatCurrency(cost.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ padding: "0.8rem 1.25rem", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "var(--ink-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Total</td>
                <td style={{ padding: "0.8rem 1.25rem", textAlign: "right", fontWeight: 600, fontFamily: "var(--font-serif), serif", fontSize: "1.1rem", color: "var(--ink)", borderTop: "1px solid var(--border)" }}>{formatCurrency(totalCosts)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Link back to bid */}
      {bid && (
        <div style={{ padding: "1rem 1.5rem", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>Original bid — {formatCurrency(bid.bid_value)} · Estimated margin {bid.margin_pct}%</p>
          <Link href={`/bids/${bid.id}`} style={{ fontSize: "12px", color: "var(--terra)", textDecoration: "none" }}>View bid →</Link>
        </div>
      )}
    </div>
  )
}

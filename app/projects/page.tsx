import { PROJECTS } from "@/lib/data"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function ProjectsPage() {
  return (
    <div style={{ maxWidth: "960px" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
          {PROJECTS.length} active project{PROJECTS.length !== 1 ? "s" : ""}
        </p>
        <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>Projects</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {PROJECTS.map(project => {
          const totalCosts = project.costs.reduce((s,c) => s + c.amount, 0)
          const budgetTotal = project.budget_labour + project.budget_materials + project.budget_equipment + project.budget_subs
          const budgetPct = Math.round((totalCosts / budgetTotal) * 100)

          const startDate = new Date(project.start_date)
          const endDate   = new Date(project.end_date)
          const today     = new Date()
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)
          const elapsedDays = Math.min(Math.ceil((today.getTime() - startDate.getTime()) / 86400000), totalDays)
          const timePct = Math.round((elapsedDays / totalDays) * 100)

          return (
            <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: "none" }} className="row-hover">
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem 1.75rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                  <div>
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", marginBottom: "0.25rem" }}>{project.project_name}</p>
                    <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{project.client} · {project.estimator}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.4rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatCurrency(project.contract_value)}</p>
                    <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.15rem" }}>{formatDate(project.start_date)} → {formatDate(project.end_date)}</p>
                  </div>
                </div>

                {/* Budget bar */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "11px", color: "var(--ink-faint)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>Budget used</span>
                    <span style={{ fontSize: "11px", color: budgetPct > 90 ? "var(--terra)" : "var(--ink-muted)", fontWeight: 500 }}>
                      {formatCurrency(totalCosts)} / {formatCurrency(budgetTotal)} ({budgetPct}%)
                    </span>
                  </div>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: budgetPct > 90 ? "var(--terra)" : "var(--sage)", borderRadius: 2, transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {/* Time bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "11px", color: "var(--ink-faint)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>Timeline</span>
                    <span style={{ fontSize: "11px", color: "var(--ink-muted)", fontWeight: 500 }}>Day {elapsedDays} of {totalDays}</span>
                  </div>
                  <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(timePct, 100)}%`, background: "var(--gold)", borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

import { getProjects } from "@/lib/sheets"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const PROJECTS = await getProjects()

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
          {PROJECTS.length} active project{PROJECTS.length !== 1 ? "s" : ""}
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>Projects</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {PROJECTS.map((project: any) => {
          const totalCosts = project.costs.reduce((s: number, c: any) => s + c.amount, 0)
          const budgetTotal = project.budget_labour + project.budget_materials + project.budget_equipment + project.budget_subs
          const budgetPct = Math.round((totalCosts / budgetTotal) * 100)
          const today = new Date(); today.setHours(0,0,0,0)
          const startD = new Date(project.start_date); startD.setHours(0,0,0,0)
          const endD = new Date(project.end_date); endD.setHours(0,0,0,0)
          const totalDays = Math.ceil((endD.getTime() - startD.getTime()) / 86400000)
          const elapsedRaw = Math.ceil((today.getTime() - startD.getTime()) / 86400000)
          const elapsedDays = Math.max(0, Math.min(elapsedRaw, totalDays))
          const timePct = Math.round(elapsedDays / totalDays * 100)
          const notStarted = today < startD

          return (
            <Link key={project.id} href={`/projects/${project.id}`} style={{ textDecoration: "none" }}>
              <div className="row-hover" style={{
                background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px",
                padding: "1rem 1.25rem", cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                  <div>
                    <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.3rem" }}>
                      {project.client}
                    </p>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                      {project.project_name}
                    </h2>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                      {formatCurrency(project.contract_value)}
                    </p>
                    {notStarted ? (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gold)", background: "var(--gold-light)", padding: "2px 8px", borderRadius: "5px" }}>
                        Mobilizing {formatDate(project.start_date)}
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--sage)", background: "var(--sage-light)", padding: "2px 8px", borderRadius: "5px" }}>
                        ● Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Budget bar */}
                <div style={{ marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Budget</span>
                    <span style={{ fontSize: "11px", color: budgetPct > 85 ? "var(--terra)" : "var(--ink-faint)", fontWeight: budgetPct > 85 ? 600 : 400 }}>
                      {formatCurrency(totalCosts)} / {formatCurrency(budgetTotal)} ({budgetPct}%)
                    </span>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: budgetPct > 85 ? "var(--terra)" : "var(--sage)", borderRadius: 3 }} />
                  </div>
                </div>

                {/* Timeline bar */}
                {!notStarted && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Timeline</span>
                      <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>
                        {formatDate(project.start_date)} → {formatDate(project.end_date)}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${timePct}%`, background: "var(--gold)", borderRadius: 3 }} />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

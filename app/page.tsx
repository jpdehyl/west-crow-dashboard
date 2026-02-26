import { BIDS, PROJECTS } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils"
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{s.label}</span>
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

  return (
    <div style={{ maxWidth: "960px", marginLeft: "-3rem", marginRight: "-3rem", marginTop: "-2.5rem" }}>

      {/* ── HERO ── */}
      <div style={{
        background: "var(--accent)",
        padding: "3rem 3rem 2.5rem",
      }}>
        <p style={{
          fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)", fontWeight: 500, marginBottom: "1rem",
        }}>{dateStr}</p>
        <h1 style={{
          fontSize: "3rem", fontWeight: 600,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "#ffffff",
          marginBottom: "0.5rem",
        }}>{formatCurrency(pipeline)}</h1>
        <p style={{
          fontSize: "15px", color: "rgba(255,255,255,0.6)", fontWeight: 400,
        }}>in active pipeline · {active.length + sent.length} open bids</p>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "2rem 3rem 2.5rem" }}>

        {/* KPIs — asymmetric layout */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1.5rem",
          marginBottom: "2.5rem",
        }}>
          <div style={{ padding: "1.25rem 0" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>Active</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{active.length}</p>
            <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>in estimation</p>
          </div>
          <div style={{ padding: "1.25rem 0" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>Awaiting</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{sent.length}</p>
            <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>pending decision</p>
          </div>
          <div style={{ padding: "1.25rem 0" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>Win Rate</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{winRate}%</p>
            <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>{won.length}/{decided.length} decided</p>
          </div>
        </div>

        {/* ── ON SITE ── */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0)
          const onSite = PROJECTS.filter(p => {
            const start = new Date(p.start_date); start.setHours(0,0,0,0)
            return p.status === 'active' && start <= today
          })
          if (onSite.length === 0) return null
          return (
            <div style={{ marginBottom: "2.5rem" }}>
              <h2 style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "0.75rem" }}>
                On Site
              </h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {onSite.map((project, i) => {
                  const spent    = project.costs.reduce((s,c) => s + c.amount, 0)
                  const budget   = project.budget_labour + project.budget_materials + project.budget_equipment + project.budget_subs
                  const pct      = Math.round(spent / budget * 100)
                  const startD   = new Date(project.start_date); startD.setHours(0,0,0,0)
                  const endD     = new Date(project.end_date);   endD.setHours(0,0,0,0)
                  const totalD   = Math.ceil((endD.getTime() - startD.getTime()) / 86400000)
                  const elapsed  = Math.ceil((today.getTime() - startD.getTime()) / 86400000)
                  const daysLeft = Math.max(0, Math.ceil((endD.getTime() - today.getTime()) / 86400000))
                  const timePct  = Math.round(Math.min(elapsed / totalD, 1) * 100)
                  const isLast   = i === onSite.length - 1

                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}
                      className="row-hover"
                      style={{
                        display: "block",
                        padding: "0.85rem 0",
                        textDecoration: "none",
                        borderBottom: isLast ? "none" : "1px solid var(--border)",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <div>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>{project.project_name}</span>
                          <span style={{ fontSize: "13px", color: "var(--ink-faint)", marginLeft: "0.6rem" }}>{project.client}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Day {elapsed} · {daysLeft}d left</span>
                          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
                            {formatCurrency(project.contract_value)}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--sage)", background: "var(--sage-light)", padding: "2px 7px", borderRadius: "4px" }}>
                            ● Active
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                            <span style={{ fontSize: "10px", color: "var(--ink-faint)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Budget</span>
                            <span style={{ fontSize: "10px", color: pct > 85 ? "var(--terra)" : "var(--ink-faint)", fontWeight: pct > 85 ? 600 : 400 }}>{pct}%</span>
                          </div>
                          <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(pct,100)}%`, background: pct > 85 ? "var(--terra)" : "var(--sage)", borderRadius: 2 }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                            <span style={{ fontSize: "10px", color: "var(--ink-faint)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Timeline</span>
                            <span style={{ fontSize: "10px", color: "var(--ink-faint)" }}>{timePct}%</span>
                          </div>
                          <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${timePct}%`, background: "var(--gold)", borderRadius: 2 }} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── URGENT BIDS ── */}
        {urgent.length > 0 && (
          <div style={{
            marginBottom: "2.5rem",
            background: "var(--gold-light)",
            borderRadius: "8px",
            padding: "1.25rem 1.5rem",
          }}>
            <h2 style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "0.6rem" }}>
              Due in 14 days
            </h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {urgent.map((bid, i) => {
                const days = daysUntil(bid.deadline)
                const isLast = i === urgent.length - 1
                return (
                  <Link key={bid.id} href={`/bids/${bid.id}`}
                    className="row-hover"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.65rem 0", textDecoration: "none",
                      borderBottom: isLast ? "none" : "1px solid rgba(184,134,11,0.15)",
                    }}>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>{bid.project_name}</span>
                      <span style={{ fontSize: "13px", color: "var(--ink-muted)", marginLeft: "0.6rem" }}>{bid.client}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                      <span style={{
                        fontSize: "12px", fontWeight: 600,
                        color: days <= 5 ? "var(--terra)" : "var(--gold)",
                        background: days <= 5 ? "var(--terra-light)" : "rgba(255,255,255,0.7)",
                        padding: "3px 8px", borderRadius: "5px"
                      }}>{days}d</span>
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
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

        {/* ── RECENT BIDS ── */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
              Recent Bids
            </h2>
            <Link href="/bids" style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>All bids →</Link>
          </div>
          <div>
            {recent.map((bid, i) => (
              <Link key={bid.id} href={`/bids/${bid.id}`}
                className="row-hover"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.55rem 0", textDecoration: "none",
                  borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>{bid.project_name}</span>
                  <span style={{ fontSize: "12px", color: "var(--ink-faint)", marginLeft: "0.6rem" }}>{bid.client}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <span style={{ fontSize: "12px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{formatDate(bid.deadline)}</span>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>
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

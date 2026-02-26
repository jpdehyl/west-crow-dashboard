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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{s.label}</span>
    </span>
  )
}

function MiniBar({ values, colors }: { values: number[]; colors: string[] }) {
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--border)", width: "100%" }}>
      {values.map((v, i) => (
        <div key={i} style={{ width: `${(v / total) * 100}%`, background: colors[i], minWidth: v > 0 ? 3 : 0 }} />
      ))}
    </div>
  )
}

function WinRateArc({ pct }: { pct: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ display: "block" }} role="img" aria-label={`Win rate ${pct}%`}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--sage)" strokeWidth="4"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.3s ease" }} />
    </svg>
  )
}

function formatCompact(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n}`
}

function relativeDate(d: string): string {
  const now = new Date()
  const then = new Date(d)
  const diffMs = now.getTime() - then.getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function DashboardPage() {
  const active  = BIDS.filter(b => b.status === "active")
  const sent    = BIDS.filter(b => b.status === "sent")
  const won     = BIDS.filter(b => b.status === "won")
  const decided = BIDS.filter(b => ["won","lost"].includes(b.status))
  const winRate = decided.length > 0 ? Math.round(won.length / decided.length * 100) : 0
  const pipeline = [...active, ...sent].reduce((s, b) => s + b.bid_value, 0)
  const activeVal = active.reduce((s, b) => s + b.bid_value, 0)
  const sentVal = sent.reduce((s, b) => s + b.bid_value, 0)

  const urgent = BIDS.filter(b => {
    const days = daysUntil(b.deadline)
    return days <= 14 && days >= 0 && !["won","lost","no-bid"].includes(b.status)
  }).sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const dateStr = new Date().toLocaleDateString("en-CA", {
    weekday: "long", month: "long", day: "numeric"
  })

  const today = new Date(); today.setHours(0,0,0,0)
  const onSite = PROJECTS.filter(p => {
    const start = new Date(p.start_date); start.setHours(0,0,0,0)
    return p.status === 'active' && start <= today
  })

  const activities: { icon: string; text: string; date: string; href: string }[] = []
  BIDS.forEach(bid => {
    bid.timeline.forEach(ev => {
      let text = ""
      if (ev.stage === "invited") text = `${bid.project_name} — bid invite received`
      else if (ev.stage === "estimating") text = `${bid.project_name} — estimation started`
      else if (ev.stage === "submitted") text = `${bid.project_name} — bid submitted`
      else if (ev.stage === "decision" && bid.status === "won") text = `${bid.project_name} — won`
      else if (ev.stage === "decision" && bid.status === "lost") text = `${bid.project_name} — lost`
      else if (ev.stage === "decision") text = `${bid.project_name} — decision made`
      if (text) {
        const icons: Record<string, string> = { invited: "📩", estimating: "📐", submitted: "📤", decision: "✅" }
        activities.push({ icon: icons[ev.stage] || "•", text, date: ev.date, href: `/bids/${bid.id}` })
      }
    })
  })
  PROJECTS.forEach(proj => {
    if (proj.invoices) {
      proj.invoices.forEach(inv => {
        if (inv.sent_date) {
          activities.push({ icon: "💰", text: `${proj.project_name} — Invoice ${inv.number} sent`, date: inv.sent_date, href: `/projects/${proj.id}` })
        }
      })
    }
  })
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recentActivity = activities.slice(0, 5)

  return (
<<<<<<< HEAD
    <div>
      <p style={{ fontSize: "13px", color: "var(--ink-faint)", fontWeight: 400, marginBottom: "1.25rem" }}>{dateStr}</p>

      <div className="kpi-grid" style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
          display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500 }}>Pipeline</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>
            {formatCurrency(pipeline)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.15rem" }}>
            <MiniBar values={[activeVal, sentVal]} colors={["#3b6fa0", "#b8860b"]} />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", fontSize: "11px", color: "var(--ink-faint)" }}>
            <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#3b6fa0", marginRight: 4 }} />Active {formatCompact(activeVal)}</span>
            <span><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#b8860b", marginRight: 4 }} />Sent {formatCompact(sentVal)}</span>
          </div>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
        }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.35rem" }}>Active Bids</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{active.length}</p>
          <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>in estimation</p>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
        }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.35rem" }}>Awaiting</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{sent.length}</p>
          <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>pending decision</p>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <WinRateArc pct={winRate} />
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.35rem" }}>Win Rate</p>
            <p style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>{winRate}%</p>
            <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>{won.length}/{decided.length} decided</p>
          </div>
        </div>
      </div>

      <div className="content-grid" style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "start" }}>
        {onSite.length > 0 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              On Site
=======
    <div className="hero-breakout" style={{ maxWidth: "960px" }}>

      {/* ── HERO ── */}
      <div style={{
        position: "relative",
        height: "clamp(200px, 30vw, 340px)",
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
        <div className="hero-text-inner">
          <p style={{
            fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)", fontWeight: 500, marginBottom: "0.6rem",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}>{dateStr}</p>
          <h1 className="hero-headline">{headline}</h1>
          <p style={{
            fontSize: "15px", color: "rgba(255,255,255,0.8)",
            textShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}>{subline}</p>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="hero-content-inner">

        {/* KPIs */}
        <div className="kpi-grid-4" style={{
          border: "1px solid var(--border)", borderRadius: "12px",
          overflow: "hidden", marginBottom: "3rem",
        }}>
          {[
            { label: "Pipeline",   value: formatCurrency(pipeline),    note: `${active.length + sent.length} open` },
            { label: "Active",     value: String(active.length),       note: "in estimation" },
            { label: "Awaiting",   value: String(sent.length),         note: "pending decision" },
            { label: "Win Rate",   value: `${winRate}%`,               note: `${won.length}/${decided.length} decided` },
          ].map(({ label, value, note }) => (
            <div key={label} className="kpi-cell" style={{
              padding: "1.5rem 1.75rem",
              background: "var(--bg)",
            }}>
              <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.6rem" }}>{label}</p>
              <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "2rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1, marginBottom: "0.35rem" }}>{value}</p>
              <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{note}</p>
            </div>
          ))}
        </div>

        {/* ── ON SITE ── */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0)
          const onSite = PROJECTS.filter(p => {
            const start = new Date(p.start_date); start.setHours(0,0,0,0)
            const end   = new Date(p.end_date);   end.setHours(0,0,0,0)
            return p.status === 'active' && start <= today
          })
          if (onSite.length === 0) return null
          return (
            <div style={{ marginBottom: "3rem" }}>
              <h2 style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "1rem" }}>
                On Site
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
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
                        padding: "1rem 0",
                        textDecoration: "none",
                        borderBottom: isLast ? "none" : "1px solid var(--border)",
                      }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                        <div>
                          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>{project.project_name}</span>
                          <span style={{ fontSize: "13px", color: "var(--ink-faint)", marginLeft: "0.75rem" }}>{project.client}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Day {elapsed} · {daysLeft}d left</span>
                          <span style={{ fontFamily: "var(--font-serif), serif", fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
                            {formatCurrency(project.contract_value)}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--sage)", background: "var(--sage-light)", padding: "2px 7px", borderRadius: "4px" }}>
                            ● Active
                          </span>
                        </div>
                      </div>
                      {/* Dual progress bars */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                            <span style={{ fontSize: "10px", color: "var(--ink-faint)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Budget</span>
                            <span style={{ fontSize: "10px", color: pct > 85 ? "var(--terra)" : "var(--ink-faint)", fontWeight: pct > 85 ? 600 : 400 }}>{pct}%</span>
                          </div>
                          <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(pct,100)}%`, background: pct > 85 ? "var(--terra)" : "var(--sage)", borderRadius: 2 }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
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

        {/* Urgent bids */}
        {urgent.length > 0 && (
          <div style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "1rem" }}>
              Due in 14 days
>>>>>>> a24d7b81b04fcfeba19bacfaae79238e9ca84a30
            </h2>
            {onSite.map((project, i) => {
              const spent   = project.costs.reduce((s,c) => s + c.amount, 0)
              const budget  = project.budget_labour + project.budget_materials + project.budget_equipment + project.budget_subs
              const pct     = budget > 0 ? Math.round(spent / budget * 100) : 0
              const startD  = new Date(project.start_date); startD.setHours(0,0,0,0)
              const endD    = new Date(project.end_date);   endD.setHours(0,0,0,0)
              const totalD  = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / 86400000))
              const elapsed = Math.ceil((today.getTime() - startD.getTime()) / 86400000)
              const daysLeft = Math.max(0, Math.ceil((endD.getTime() - today.getTime()) / 86400000))
              const timePct = Math.round(Math.min(elapsed / totalD, 1) * 100)
              const isLast  = i === onSite.length - 1

              return (
                <Link key={project.id} href={`/projects/${project.id}`}
                  className="row-hover"
                  style={{
                    display: "block", padding: "0.75rem 0", textDecoration: "none",
                    borderBottom: isLast ? "none" : "1px solid var(--border)",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>{project.project_name}</span>
                      <span style={{ fontSize: "12px", color: "var(--ink-faint)", marginLeft: "0.5rem" }}>{project.client}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                        {formatCurrency(project.contract_value)}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--sage)", background: "var(--sage-light)", padding: "2px 6px", borderRadius: "4px" }}>
                        Day {elapsed}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Budget</span>
                        <span style={{ fontSize: "11px", color: pct > 85 ? "var(--terra)" : "var(--ink-muted)", fontWeight: 500 }}>
                          {formatCompact(spent)} / {formatCompact(budget)}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(pct,100)}%`, background: pct > 85 ? "var(--terra)" : "var(--sage)", borderRadius: 3 }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>Timeline</span>
                        <span style={{ fontSize: "11px", color: "var(--ink-muted)", fontWeight: 500 }}>{daysLeft}d left</span>
                      </div>
                      <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${timePct}%`, background: "var(--gold)", borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {urgent.length > 0 && (
          <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
            <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              Due Soon
            </h2>
            {urgent.map((bid, i) => {
              const days = daysUntil(bid.deadline)
              const isLast = i === urgent.length - 1
              return (
                <Link key={bid.id} href={`/bids/${bid.id}`}
                  className="row-hover"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0.55rem 0", textDecoration: "none",
                    borderBottom: isLast ? "none" : "1px solid var(--border)",
                  }}>
                  <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{bid.project_name}</span>
                    <span style={{ fontSize: "12px", color: "var(--ink-faint)", marginLeft: "0.4rem" }}>{bid.client}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 600, minWidth: "2rem", textAlign: "center",
                      color: days <= 5 ? "var(--terra)" : "var(--gold)",
                      background: days <= 5 ? "var(--terra-light)" : "var(--gold-light)",
                      padding: "2px 6px", borderRadius: "4px",
                    }}>{days}d</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>
                      {formatCurrency(bid.bid_value)}
                    </span>
                    <Dot status={bid.status} />
                  </div>
                </Link>
              )
            })}
            <div style={{ marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
              <Link href="/bids" style={{ fontSize: "12px", color: "var(--ink-muted)", textDecoration: "none", fontWeight: 500 }}>
                View pipeline →
              </Link>
            </div>
          </div>
        )}
      </div>

      {recentActivity.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem" }}>
          <h2 style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
            Recent Activity
          </h2>
          {recentActivity.map((item, i) => (
            <Link key={`${item.href}-${item.date}-${i}`} href={item.href}
              className="row-hover"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.45rem 0", textDecoration: "none",
                borderBottom: i < recentActivity.length - 1 ? "1px solid var(--border)" : "none",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 400 }}>{item.text}</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--ink-faint)", whiteSpace: "nowrap", marginLeft: "0.75rem" }}>
                {relativeDate(item.date)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

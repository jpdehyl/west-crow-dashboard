import { CLIENTS, BIDS, PROJECTS } from "@/lib/data"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import Link from "next/link"
import { notFound } from "next/navigation"

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = CLIENTS.find(c => c.id === params.id)
  if (!client) notFound()

  const clientBids = BIDS.filter(b => b.client_id === client.id)
    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const clientProjects = PROJECTS.filter(p => p.client_id === client.id)

  const won = clientBids.filter(b => b.status === 'won')
  const active = clientBids.filter(b => ['active','sent'].includes(b.status))
  const decided = clientBids.filter(b => ['won','lost'].includes(b.status))
  const winRate = decided.length > 0 ? Math.round(won.length / decided.length * 100) : null
  const totalWon = won.reduce((s,b) => s + b.bid_value, 0)
  const totalPipeline = active.reduce((s,b) => s + b.bid_value, 0)

  return (
    <div>
      <Link href="/clients" style={{
        fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none",
        display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1rem",
      }}>
        ← Clients
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>
            {client.type} client
          </p>
          <h1 className="font-serif" style={{ fontSize: "1.5rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: "0.5rem" }}>
            {client.name}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ fontSize: "14px", color: "var(--ink-muted)" }}>{client.contact_name}</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <a href={`mailto:${client.email}`} style={{ fontSize: "14px", color: "var(--accent)", textDecoration: "none" }}>
              {client.email}
            </a>
            <span style={{ color: "var(--border)" }}>·</span>
            <a href={`tel:${client.phone}`} style={{ fontSize: "14px", color: "var(--ink-muted)", textDecoration: "none" }}>
              {client.phone}
            </a>
          </div>
        </div>
        <Link href="/bids/new" style={{
          padding: "0.55rem 1.1rem",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          + New Bid
        </Link>
      </div>

      {/* KPIs */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px",
        background: "var(--border)", border: "1px solid var(--border)",
        borderRadius: "12px", overflow: "hidden", marginBottom: "1.5rem",
      }}>
        {[
          { label: "Total Won",    value: formatCurrency(totalWon),              sub: `${won.length} project${won.length !== 1 ? 's' : ''}` },
          { label: "Pipeline",     value: formatCurrency(totalPipeline),         sub: `${active.length} active bid${active.length !== 1 ? 's' : ''}` },
          { label: "Win Rate",     value: winRate !== null ? `${winRate}%` : "—", sub: `${decided.length} decided` },
          { label: "Total Bids",   value: String(clientBids.length),             sub: "all time" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "var(--bg)", padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
            <p className="kpi-value" style={{ fontSize: "1.35rem", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.3rem" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Active Projects */}
      {clientProjects.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 500, marginBottom: "1rem" }}>
            Active Projects
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {clientProjects.map(p => {
              const spent = p.costs.reduce((s,c) => s + c.amount, 0)
              const budget = p.budget_labour + p.budget_materials + p.budget_equipment + p.budget_subs
              const pct = Math.round(spent / budget * 100)
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="row-hover" style={{
                  display: "block", padding: "1rem 1.25rem",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "10px", textDecoration: "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginBottom: "0.2rem" }}>{p.project_name}</p>
                      <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{formatDate(p.start_date)} → {formatDate(p.end_date)}</p>
                    </div>
                    <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)" }}>{formatCurrency(p.contract_value)}</span>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "11px", color: "var(--ink-faint)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Budget</span>
                      <span style={{ fontSize: "11px", color: pct > 85 ? "var(--terra)" : "var(--ink-faint)" }}>{formatCurrency(spent)} / {formatCurrency(budget)} ({pct}%)</span>
                    </div>
                    <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: pct > 85 ? "var(--terra)" : "var(--sage)", borderRadius: 2 }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* All Bids */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 500 }}>
            Bid History
          </p>
          <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{clientBids.length} total</span>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          {clientBids.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--ink-faint)", fontSize: "13px" }}>
              No bids yet for this client
            </div>
          ) : clientBids.map((bid, i) => (
            <Link key={bid.id} href={`/bids/${bid.id}`} className="row-hover" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.7rem 1rem", background: "var(--bg)", textDecoration: "none",
              borderBottom: i < clientBids.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", marginBottom: "0.15rem" }}>{bid.project_name}</p>
                <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>Due {formatDate(bid.deadline)}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ink)" }}>
                  {formatCurrency(bid.bid_value)}
                </span>
                <StatusDot status={bid.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

import { CLIENTS, BIDS } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import Link from "next/link"

export default function ClientsPage() {
  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
          {CLIENTS.length} clients
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>
          Clients
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        {CLIENTS.map((client, i) => {
          const clientBids = BIDS.filter(b => b.client_id === client.id)
          const won = clientBids.filter(b => b.status === 'won')
          const decided = clientBids.filter(b => ['won','lost'].includes(b.status))
          const totalWon = won.reduce((s,b) => s + b.bid_value, 0)
          const winRate = decided.length > 0 ? Math.round(won.length / decided.length * 100) : null
          const recent = [...clientBids].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3)

          return (
            <div key={client.id} style={{
              background: "var(--bg)",
              borderBottom: i < CLIENTS.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <Link href={`/clients/${client.id}`} className="row-hover" style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                padding: "1rem 1.25rem", textDecoration: "none",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.25rem" }}>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)" }}>{client.name}</p>
                    <span style={{ fontSize: "11px", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{client.type}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginBottom: "0.75rem" }}>
                    {client.contact_name} ·{" "}
                    <span style={{ color: "var(--accent)" }}>{client.email}</span>
                    {" "}· {client.phone}
                  </p>
                  {recent.length > 0 && (
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {recent.map(bid => (
                        <span key={bid.id} style={{
                          fontSize: "12px", padding: "3px 10px", borderRadius: "20px",
                          background: "var(--bg-subtle)", border: "1px solid var(--border)",
                          color: "var(--ink-muted)",
                          display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        }}>
                          <StatusDot status={bid.status} showLabel={false} />
                          {bid.project_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1.5rem" }}>
                  {totalWon > 0 && (
                    <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.2rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
                      {formatCurrency(totalWon)}
                    </p>
                  )}
                  <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.15rem" }}>
                    {clientBids.length} bid{clientBids.length !== 1 ? 's' : ''}
                    {winRate !== null ? ` · ${winRate}% win` : ''}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--accent)", marginTop: "0.4rem" }}>View →</p>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

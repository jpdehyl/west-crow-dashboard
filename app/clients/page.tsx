import { CLIENTS, BIDS } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import Link from "next/link"

export default function ClientsPage() {
  return (
    <div style={{ maxWidth: "960px" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>{CLIENTS.length} clients</p>
        <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>Clients</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        {CLIENTS.map((client, i) => {
          const clientBids = BIDS.filter(b => b.client_id === client.id)
          const won = clientBids.filter(b => b.status === 'won')
          const decided = clientBids.filter(b => ['won','lost'].includes(b.status))
          const totalWon = won.reduce((s,b) => s + b.bid_value, 0)
          const winRate = decided.length > 0 ? Math.round(won.length / decided.length * 100) : null
          const recent = clientBids.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,2)

          return (
            <div key={client.id} style={{ background: "var(--bg)", borderBottom: i < CLIENTS.length - 1 ? "1px solid var(--border)" : "none", padding: "1.5rem 1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink)", marginBottom: "0.2rem" }}>{client.name}</p>
                  <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{client.contact_name} · <a href={`mailto:${client.email}`} style={{ color: "var(--terra)", textDecoration: "none" }}>{client.email}</a> · {client.phone}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.2rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatCurrency(totalWon)}</p>
                  <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.15rem" }}>
                    {clientBids.length} bid{clientBids.length !== 1 ? 's' : ''}
                    {winRate !== null ? ` · ${winRate}% win` : ''}
                  </p>
                </div>
              </div>
              {recent.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {recent.map(bid => (
                    <Link key={bid.id} href={`/bids/${bid.id}`} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--ink-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <StatusDot status={bid.status} showLabel={false} />
                      {bid.project_name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

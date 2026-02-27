import Link from "next/link"
import { StatusDot } from "@/components/StatusDot"
import { WinRateArc } from "@/components/WinRateArc"
import { BIDS, CLIENTS } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"

const NOW_TS = Date.now()

const AVATAR_PALETTE = [
  { bg: "var(--terra-light)", color: "var(--terra)" },
  { bg: "var(--gold-light)", color: "var(--gold)" },
  { bg: "var(--sage-light)", color: "var(--sage)" },
  { bg: "var(--accent-light)", color: "var(--accent)" },
]

function relativeDate(d: string, nowTs: number) {
  const days = Math.floor((nowTs - new Date(d).getTime()) / 86400000)
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function ClientsPage() {
  const allClientBids = CLIENTS.map((c) => BIDS.filter((b) => b.client_id === c.id))
  const totalRevenue = allClientBids
    .flat()
    .filter((b) => b.status === "won")
    .reduce((s, b) => s + b.bid_value, 0)
  const allDecided = allClientBids.flat().filter((b) => ["won", "lost"].includes(b.status))
  const allWon = allClientBids.flat().filter((b) => b.status === "won")
  const avgWinRate = allDecided.length > 0 ? Math.round((allWon.length / allDecided.length) * 100) : 0
  const topClient = CLIENTS.map((c) => {
    const won = BIDS.filter((b) => b.client_id === c.id && b.status === "won")
    return { name: c.name, revenue: won.reduce((s, b) => s + b.bid_value, 0) }
  }).sort((a, b) => b.revenue - a.revenue)[0]

  const clientStats = CLIENTS.map((client) => {
    const clientBids = BIDS.filter((bid) => bid.client_id === client.id)
    const won = clientBids.filter((bid) => bid.status === "won")
    const decided = clientBids.filter((bid) => ["won", "lost"].includes(bid.status))
    const totalWon = won.reduce((sum, bid) => sum + bid.bid_value, 0)
    const winRate = decided.length > 0 ? Math.round((won.length / decided.length) * 100) : 0
    const recentBids = [...clientBids]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)

    const lastBid = [...clientBids].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0]
    const daysSince = lastBid ? (NOW_TS - new Date(lastBid.created_at).getTime()) / 86400000 : Infinity
    const hasActive = clientBids.some((b) => ["active", "sent"].includes(b.status))
    const relStatus = hasActive
      ? { label: "Active", color: "var(--sage)", bg: "var(--sage-light)" }
      : daysSince < 90
        ? { label: "Recent", color: "var(--gold)", bg: "var(--gold-light)" }
        : daysSince < 365
          ? { label: "Dormant", color: "var(--ink-faint)", bg: "var(--bg-subtle)" }
          : { label: "Cold", color: "var(--ink-faint)", bg: "var(--bg-subtle)" }

    return {
      client,
      clientBids,
      won,
      totalWon,
      winRate,
      recentBids,
      lastBid,
      relStatus,
    }
  })

  const rankedByRevenue = [...clientStats].filter((c) => c.totalWon > 0).sort((a, b) => b.totalWon - a.totalWon)
  const maxRevenue = Math.max(...clientStats.map((c) => c.totalWon), 1)

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            fontWeight: 500,
            marginBottom: "0.5rem",
          }}
        >
          {CLIENTS.length} clients
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>Clients</h1>
      </div>

      <div className="kpi-grid-4" style={{ gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.9rem 1rem" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)", fontWeight: 600 }}>Clients</p>
          <p className="kpi-value" style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{CLIENTS.length}</p>
        </div>
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.9rem 1rem" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)", fontWeight: 600 }}>Revenue Won</p>
          <p className="kpi-value" style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{formatCurrency(totalRevenue)}</p>
        </div>
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.9rem 1rem" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)", fontWeight: 600 }}>Avg Win Rate</p>
          <p className="kpi-value" style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{avgWinRate}%</p>
        </div>
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.9rem 1rem" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-faint)", fontWeight: 600 }}>Top Client</p>
          <p className="kpi-value" style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>{topClient?.name ?? "—"}</p>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{topClient?.revenue ? formatCurrency(topClient.revenue) : "No won bids"}</p>
        </div>
      </div>

      <div className="clients-card-grid" style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {clientStats.map(({ client, clientBids, won, totalWon, winRate, recentBids, lastBid, relStatus }) => {
          const palette = AVATAR_PALETTE[client.name.charCodeAt(0) % AVATAR_PALETTE.length]
          const initials = client.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
          const contactLine = [client.contact_name || "No primary contact", client.email || "No email"]
            .filter(Boolean)
            .join(" · ")

          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="row-hover"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--bg)",
                padding: "1rem",
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", minWidth: 0 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: palette.bg,
                      color: palette.color,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{client.name}</p>
                    <p style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {client.type} · {clientBids.length > 0 ? `${clientBids.length} bids` : "No bids"}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 20,
                    color: relStatus.color,
                    background: relStatus.bg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {relStatus.label}
                </span>
              </div>

              <p style={{ color: "var(--ink-muted)", fontSize: 13, marginTop: "0.6rem", marginBottom: "0.75rem" }}>{contactLine}</p>

              {clientBids.length > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div>
                      <p className="kpi-value" style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>
                        {formatCurrency(totalWon)}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                        {clientBids.length} bids · {won.length} won
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <WinRateArc pct={winRate} />
                      <p className="kpi-value" style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--ink)", minWidth: 38 }}>
                        {winRate}%
                      </p>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                      {recentBids.map((bid) => (
                        <span
                          key={bid.id}
                          style={{
                            fontSize: 12,
                            padding: "3px 10px",
                            borderRadius: 20,
                            background: "var(--bg-subtle)",
                            border: "1px solid var(--border)",
                            color: "var(--ink-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          <StatusDot status={bid.status} showLabel={false} />
                          {bid.project_name}
                        </span>
                      ))}
                    </div>
                    {lastBid && <p style={{ fontSize: 11, color: "var(--ink-faint)" }}>Last bid {relativeDate(lastBid.created_at, NOW_TS)}</p>}
                  </div>
                </>
              )}
            </Link>
          )
        })}
      </div>

      <section style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1rem 1rem 0.8rem" }}>
        <h2
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ink-faint)",
            fontWeight: 600,
            marginBottom: "0.75rem",
          }}
        >
          Revenue by Client
        </h2>

        {rankedByRevenue.map(({ client, totalWon }) => (
          <div key={client.id} style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", gap: "0.75rem" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>{client.name}</span>
              <span className="kpi-value" style={{ fontSize: "1rem", color: "var(--ink)", whiteSpace: "nowrap" }}>
                {formatCurrency(totalWon)}
              </span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(totalWon / maxRevenue) * 100}%`,
                  background: "var(--sage)",
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

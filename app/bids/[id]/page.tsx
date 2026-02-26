import { BIDS, CLIENTS, BidStage } from "@/lib/data"
import { formatCurrency, formatDate, formatDateShort, daysUntil, STATUS_COLOR, statusLabel } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import BidActions from "@/components/BidActions"
import Link from "next/link"
import { notFound } from "next/navigation"

const STAGE_ORDER: BidStage[] = ['invited','estimating','submitted','decision']
const STAGE_LABEL: Record<BidStage, string> = { invited: 'Invited', estimating: 'Estimating', submitted: 'Submitted', decision: 'Decision' }

const DOC_LABEL = { bid_docs: 'Bid Documents', drawings: 'Drawings', hazmat: 'Hazmat Report', quote_sheet: 'Quote Sheet', addendum: 'Addendum' }

export default function BidDetailPage({ params }: { params: { id: string } }) {
  const bid = BIDS.find(b => b.id === params.id)
  if (!bid) notFound()
  const client = CLIENTS.find(c => c.id === bid.client_id)
  const days = daysUntil(bid.deadline)
  const urgent = days <= 7 && !['won','lost','no-bid'].includes(bid.status)
  const completedStages = new Set(bid.timeline.map(e => e.stage))
  const currentStageIdx = Math.max(...bid.timeline.map(e => STAGE_ORDER.indexOf(e.stage)))

  return (
    <div style={{ maxWidth: "860px" }}>
      {/* Back */}
      <Link href="/bids" style={{ fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.75rem" }}>
        ← Pipeline
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: "0.4rem" }}>
            {bid.project_name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href={`/clients/${bid.client_id}`} style={{ fontSize: "14px", color: "var(--ink-muted)", textDecoration: "none" }}>{bid.client}</Link>
            {client && <span style={{ fontSize: "13px", color: "var(--ink-faint)" }}>{client.contact_name} · {client.phone}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.75rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>
            {formatCurrency(bid.bid_value)}
          </p>
          <StatusDot status={bid.status} />
        </div>
      </div>

      {/* Timeline strip */}
      <div style={{ display: "flex", alignItems: "flex-start", margin: "2rem 0", padding: "1.5rem", background: "var(--bg-subtle)", borderRadius: "10px", border: "1px solid var(--border)" }}>
        {STAGE_ORDER.map((stage, i) => {
          const event = bid.timeline.find(e => e.stage === stage)
          const isComplete = completedStages.has(stage)
          const isCurrent = i === currentStageIdx
          const isLast = i === STAGE_ORDER.length - 1
          return (
            <div key={stage} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* Connector line */}
              {!isLast && (
                <div style={{
                  position: "absolute", top: "9px", left: "50%", width: "100%",
                  height: "2px", background: i < currentStageIdx ? "var(--terra)" : "var(--border)",
                  zIndex: 0,
                }} />
              )}
              {/* Dot */}
              <div style={{
                width: 18, height: 18, borderRadius: "50%", zIndex: 1,
                background: isComplete ? "var(--terra)" : "var(--border)",
                border: isCurrent ? "3px solid var(--terra)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {isComplete && <span style={{ color: "white", fontSize: "9px", fontWeight: 700 }}>✓</span>}
              </div>
              <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.5rem", color: isComplete ? "var(--ink)" : "var(--ink-faint)" }}>
                {STAGE_LABEL[stage]}
              </p>
              {event ? (
                <p style={{ fontSize: "11px", color: "var(--terra)", marginTop: "0.2rem" }}>{formatDateShort(event.date)}</p>
              ) : (
                <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.2rem" }}>
                  {stage === 'decision' && urgent ? `${days}d` : "—"}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* 3 col stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", marginBottom: "2.5rem" }}>
        {[
          { label: "Deadline",   value: formatDate(bid.deadline), sub: urgent ? `${days} days left` : bid.status === 'won' ? 'Closed' : '' },
          { label: "Estimator",  value: bid.estimator, sub: "West Crow" },
          { label: "Margin",     value: bid.margin_pct != null ? `${bid.margin_pct}%` : "—", sub: bid.margin_pct ? "on win" : "pending" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "var(--bg)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontSize: "1.25rem", fontFamily: "var(--font-serif), serif", color: "var(--ink)", letterSpacing: "-0.02em" }}>{value}</p>
            {sub && <p style={{ fontSize: "11px", color: urgent && label === "Deadline" ? "var(--terra)" : "var(--ink-faint)", marginTop: "0.2rem" }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Status Actions */}
      <div style={{ marginBottom: "2.5rem" }}>
        <BidActions bidId={bid.id} currentStatus={bid.status as any} currentValue={bid.bid_value} />
      </div>

      {/* Notes */}
      {bid.notes && (
        <div style={{ marginBottom: "2.5rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem" }}>Notes</p>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.7, background: "var(--bg-subtle)", padding: "1.25rem 1.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            {bid.notes}
          </p>
        </div>
      )}

      {/* Documents */}
      {bid.documents && bid.documents.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem" }}>Documents</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {bid.documents.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.25rem", background: "var(--bg)", borderBottom: i < bid.documents!.length - 1 ? "1px solid var(--border)" : "none", textDecoration: "none", color: "var(--ink)", fontSize: "14px", fontWeight: 500 }}
                className="row-hover">
                <span>{DOC_LABEL[doc.type] || doc.name}</span>
                <span style={{ fontSize: "12px", color: "var(--terra)" }}>Open ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      <div>
        <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem" }}>Activity Log</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {[...bid.timeline].reverse().map((event, i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.9rem 0", borderBottom: i < bid.timeline.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--terra)", marginTop: "5px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", marginRight: "0.5rem" }}>{STAGE_LABEL[event.stage]}</span>
                <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{event.note}</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                {formatDateShort(event.date)}{event.by ? ` · ${event.by}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* If won — link to project */}
      {bid.status === 'won' && (
        <div style={{ marginTop: "2.5rem", padding: "1.25rem 1.5rem", background: "var(--sage-light)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--sage)", marginBottom: "0.2rem" }}>This bid was won ✓</p>
            <p style={{ fontSize: "12px", color: "var(--sage)" }}>View the active project — daily logs, costs, and progress.</p>
          </div>
          <Link href="/projects/p1" style={{ padding: "0.6rem 1.25rem", background: "var(--sage)", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
            Open Project →
          </Link>
        </div>
      )}
    </div>
  )
}

import { getBid, getClients, getProjects } from "@/lib/sheets"
import { formatCurrency, formatDate, formatDateShort, daysUntil, STATUS_COLOR, statusLabel } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import BidActions from "@/components/BidActions"
import CloneBidButton from "@/components/CloneBidButton"
import AddDocumentForm from "@/components/AddDocumentForm"
import EditBidForm from "@/components/EditBidForm"
import EstimateStatusButton from "@/components/EstimateStatusButton"
import Link from "next/link"
import { notFound } from "next/navigation"
import { toDropboxWebUrl } from "@/lib/dropbox"

export const revalidate = 60

type BidStage = 'invited' | 'estimating' | 'submitted' | 'decision'
const STAGE_ORDER: BidStage[] = ['invited','estimating','submitted','decision']
const STAGE_LABEL: Record<BidStage, string> = { invited: 'Invited', estimating: 'Estimating', submitted: 'Submitted', decision: 'Decision' }
const DOC_LABEL: Record<string, string> = { bid_docs: 'Bid Documents', drawings: 'Drawings', hazmat: 'Hazmat Report', quote_sheet: 'Quote Sheet', addendum: 'Addendum' }

export default async function BidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [bid, clients, projects] = await Promise.all([getBid(id), getClients(), getProjects()])
  if (!bid) notFound()



  const client = (clients as any[]).find((c: any) => c.id === bid.client_id)
  const timeline = Array.isArray((bid as any).timeline) ? ((bid as any).timeline as any[]) : []
  const documents = Array.isArray((bid as any).documents) ? ((bid as any).documents as any[]) : []
  const days = daysUntil(bid.deadline)
  const urgent = days <= 7 && !['won','lost','no-bid'].includes(bid.status)
  const completedStages = new Set(timeline.map((e: any) => e.stage))
  const currentStageIdx = timeline.length > 0 ? Math.max(...timeline.map((e: any) => STAGE_ORDER.indexOf(e.stage))) : -1
  const linkedProject = (projects as any[]).find((project: any) => project.bid_id === bid.id)

  return (
    <div>
      <Link href="/bids" style={{ fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1rem" }}>
        ← Pipeline
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: "0.4rem" }}>
            {bid.project_name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href={`/clients/${bid.client_id}`} style={{ fontSize: "14px", color: "var(--ink-muted)", textDecoration: "none" }}>{bid.client}</Link>
            {client && <span style={{ fontSize: "13px", color: "var(--ink-faint)" }}>{client.contact_name} · {client.phone}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <p style={{ fontSize: "1.35rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>
            {formatCurrency(bid.bid_value)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <StatusDot status={bid.status} />
            <EstimateStatusButton
              bidId={bid.id}
              bidName={bid.project_name}
              documents={documents}
              estimateData={(bid as any).estimate_data ?? null}
              dropboxFolder={(bid as any).dropbox_folder ?? ""}
              bidStatus={bid.status}
            />
            <EditBidForm bid={bid as any} clients={clients as any[]} />
            <CloneBidButton bidId={bid.id} />
          </div>
        </div>
      </div>

      {/* Timeline strip */}
      <div style={{ display: "flex", alignItems: "flex-start", margin: "1.25rem 0", padding: "1rem", background: "var(--bg-subtle)", borderRadius: "10px", border: "1px solid var(--border)" }}>
        {STAGE_ORDER.map((stage, i) => {
          const event = timeline.find((e: any) => e.stage === stage)
          const isComplete = completedStages.has(stage)
          const isCurrent = i === currentStageIdx
          const isLast = i === STAGE_ORDER.length - 1
          return (
            <div key={stage} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {!isLast && (
                <div style={{ position: "absolute", top: "9px", left: "50%", width: "100%", height: "2px", background: i < currentStageIdx ? "var(--accent)" : "var(--border)", zIndex: 0 }} />
              )}
              <div style={{ width: 18, height: 18, borderRadius: "50%", zIndex: 1, background: isComplete ? "var(--accent)" : "var(--border)", border: isCurrent ? "3px solid var(--accent)" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {isComplete && <span style={{ color: "white", fontSize: "9px", fontWeight: 700 }}>✓</span>}
              </div>
              <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.5rem", color: isComplete ? "var(--ink)" : "var(--ink-faint)" }}>
                {STAGE_LABEL[stage]}
              </p>
              {event ? (
                <p style={{ fontSize: "11px", color: "var(--accent)", marginTop: "0.2rem" }}>{formatDateShort(event.date)}</p>
              ) : (
                <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.2rem" }}>
                  {stage === 'decision' && urgent ? `${days}d` : "—"}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* KPIs */}
      <div className="kpi-grid-3" style={{ display: "grid", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", marginBottom: "1.5rem" }}>
        {[
          { label: "Deadline",  value: formatDate(bid.deadline), sub: urgent ? `${days} days left` : bid.status === 'won' ? 'Closed' : '' },
          { label: "Estimator", value: bid.estimator, sub: "West Crow" },
          { label: "Margin",    value: bid.margin_pct != null ? `${bid.margin_pct}%` : "—", sub: bid.margin_pct ? "on win" : "pending" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: "var(--bg)", padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>{value}</p>
            {sub && <p style={{ fontSize: "11px", color: urgent && label === "Deadline" ? "var(--terra)" : "var(--ink-faint)", marginTop: "0.2rem" }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Status Actions */}
      <div style={{ marginBottom: "1.5rem" }}>
        <BidActions bidId={bid.id} currentStatus={bid.status as any} currentValue={bid.bid_value} />
      </div>

      {/* Notes */}
      {bid.notes && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem" }}>Notes</p>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.7, background: "var(--bg-subtle)", padding: "1.25rem 1.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
            {bid.notes}
          </p>
        </div>
      )}

      {/* Dropbox Folder */}
      {(bid as any).dropbox_folder && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>Dropbox Folder</p>
          <a href={toDropboxWebUrl((bid as any).dropbox_folder)} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", color: "var(--accent)", textDecoration: "none", padding: "0.5rem 0.85rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "7px" }}>
            <span>📁</span>
            <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{(bid as any).dropbox_folder.replace('https://www.dropbox.com', '')}</span>
            <span>↗</span>
          </a>
        </div>
      )}

      {/* Documents */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem" }}>Documents</p>
        {documents.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", marginBottom: "0.75rem" }}>
            {documents.map((doc: any, i: number) => (
              <div key={i}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.25rem", background: "var(--bg)", borderBottom: i < documents.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "13px", color: "var(--ink-faint)" }}>
                    {doc.type === "drawings" ? "📐" : doc.type === "bid_docs" ? "📋" : doc.type === "hazmat" ? "☣️" : doc.type === "quote_sheet" ? "💲" : "📄"}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>{DOC_LABEL[doc.type] || doc.name}</span>
                </div>
                <a href={toDropboxWebUrl(doc.url)} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "12px", color: "var(--accent)", textDecoration: "none", padding: "0.3rem 0.7rem", border: "1px solid var(--border)", borderRadius: "5px", whiteSpace: "nowrap" }}>
                  Open in Dropbox ↗
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: "13px", color: "var(--ink-faint)" }}>No documents cached yet.</p>
            {bid.dropbox_folder && (
              <a href={toDropboxWebUrl(bid.dropbox_folder)} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: "13px", color: "var(--accent)", textDecoration: "none" }}>📂 Open Dropbox folder ↗</a>
            )}
          </div>
        )}
        <AddDocumentForm bidId={bid.id} />
      </div>

      {/* Estimate link */}
      <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "0.2rem" }}>Estimate Builder</p>
          <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>Build and review the full estimate for this bid</p>
        </div>
        <Link href={`/bids/${bid.id}/estimate`}
          style={{ padding: "0.55rem 1.1rem", background: "var(--ink)", color: "var(--bg)", borderRadius: "7px", fontSize: "13px", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
          Open Estimate →
        </Link>
      </div>

      {/* Activity */}
      <div>
        <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.75rem" }}>Activity Log</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {[...timeline].reverse().map((event: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.9rem 0", borderBottom: i < timeline.length - 1 ? "1px solid var(--border)" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginTop: "5px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", marginRight: "0.5rem" }}>{STAGE_LABEL[event.stage as BidStage] ?? event.stage}</span>
                <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{event.note}</span>
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                {formatDateShort(event.date)}{event.by ? ` · ${event.by}` : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Won → link to project */}
      {bid.status === 'won' && (
        <div style={{ marginTop: "1.5rem", padding: "1.25rem 1.5rem", background: "var(--sage-light)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--sage)", marginBottom: "0.2rem" }}>This bid was won ✓</p>
            <p style={{ fontSize: "12px", color: "var(--sage)" }}>Ready to track this job? Create a project to log costs, daily reports, and progress.</p>
          </div>
          <Link
            href={linkedProject ? `/projects/${linkedProject.id}` : '/projects/new'}
            style={{ padding: "0.6rem 1.25rem", background: "var(--sage)", color: "white", borderRadius: "8px", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
          >
            {linkedProject ? 'View Project →' : '+ Create Project'}
          </Link>
        </div>
      )}
    </div>
  )
}

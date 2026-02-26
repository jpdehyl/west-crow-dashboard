"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

// ── Types ────────────────────────────────────────────────────────────────

type EstimateState = "no_quantities" | "ready" | "clark_working" | "clark_draft" | "approved" | "view_only" | "hidden"

type DocEntry = { name: string; url: string; type: string }

// Bid statuses where the estimate phase is already past — don't prompt Clark
const CLOSED_STATUSES = ["won", "lost", "no-bid", "sent"]

// ── Helpers ───────────────────────────────────────────────────────────────

function getState(documents: DocEntry[], estimateData: string | null, bidStatus: string): EstimateState {
  // Bid is already past the estimate stage — show view-only or nothing
  if (CLOSED_STATUSES.includes(bidStatus)) {
    if (!estimateData) return "hidden"         // won/lost with no estimate data (legacy seed bids)
    try {
      const parsed = JSON.parse(estimateData)
      const status = parsed?.meta?.status
      if (status === "approved") return "approved"
    } catch {}
    return "view_only"
  }

  const hasDrawings = documents.some(d => d.type === "drawings")
  const hasScope    = documents.some(d => d.type === "bid_docs")

  if (!hasDrawings || !hasScope) return "no_quantities"

  if (!estimateData) return "ready"

  try {
    const parsed = JSON.parse(estimateData)
    const status = parsed?.meta?.status
    if (status === "clark_draft")   return "clark_draft"
    if (status === "clark_working") return "clark_working"
    if (status === "approved")      return "approved"
  } catch {}

  return "ready"
}

function getMissingDocs(documents: DocEntry[]) {
  const missing = []
  if (!documents.some(d => d.type === "drawings")) missing.push("Drawings / Floor Plans")
  if (!documents.some(d => d.type === "bid_docs")) missing.push("Bid Documents / Scope Letter")
  return missing
}

function getUnresolvedFlags(estimateData: string | null): number {
  if (!estimateData) return 0
  try {
    const parsed = JSON.parse(estimateData)
    return (parsed?.meta?.assumptions ?? []).filter((a: any) => !a.resolved && a.severity === "flag").length
  } catch { return 0 }
}

function getClarkTriggeredAt(estimateData: string | null): string | null {
  if (!estimateData) return null
  try {
    const parsed = JSON.parse(estimateData)
    return parsed?.meta?.clark_triggered_at ?? null
  } catch { return null }
}

// ── State config ──────────────────────────────────────────────────────────

const STATE_CONFIG: Record<Exclude<EstimateState, "hidden">, {
  label: string
  icon: string
  bg: string
  color: string
  border: string
  disabled?: boolean
  description: string
}> = {
  no_quantities: {
    label: "Need Quantities",
    icon: "⚠️",
    bg: "#fffbf0",
    color: "#92660a",
    border: "#e0c040",
    description: "Missing required documents before Clark can estimate",
  },
  ready: {
    label: "Start Estimate",
    icon: "📐",
    bg: "var(--ink)",
    color: "var(--bg)",
    border: "var(--ink)",
    description: "Documents ready — trigger Clark to begin",
  },
  clark_working: {
    label: "Clark Working…",
    icon: "⏳",
    bg: "var(--bg-subtle)",
    color: "var(--ink-muted)",
    border: "var(--border)",
    disabled: true,
    description: "Clark is reading the documents and building the estimate",
  },
  clark_draft: {
    label: "Review Clark's Draft",
    icon: "🔴",
    bg: "#c45042",
    color: "#fff",
    border: "#c45042",
    description: "Clark has posted a draft — your review is needed",
  },
  approved: {
    label: "Estimate Approved",
    icon: "✓",
    bg: "#f0faf4",
    color: "#3d8c5c",
    border: "#3d8c5c",
    description: "Approved — ready for BuilderTrend",
  },
  view_only: {
    label: "View Estimate",
    icon: "📐",
    bg: "var(--bg-subtle)",
    color: "var(--ink-muted)",
    border: "var(--border)",
    description: "Estimate on file",
  },
}

// ── Modal: missing docs ───────────────────────────────────────────────────

function MissingDocsModal({ missing, onClose, bidId }: { missing: string[]; onClose: () => void; bidId: string }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 101, background: "var(--bg)", borderRadius: "14px", border: "1px solid var(--border)",
        width: "min(480px, 94vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", padding: "1.5rem",
      }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>Can't estimate yet</h2>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
          Clark needs quantity sources before he can build an estimate. Either attach the documents below, or log a site visit.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.25rem" }}>
          {missing.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.85rem", background: "#fff5f5", border: "1px solid #f5a0a0", borderRadius: "7px" }}>
              <span>🚩</span>
              <span style={{ fontSize: "13px", color: "#c0392b", fontWeight: 500 }}>{m}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "0.6rem 1.1rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            Close
          </button>
          <button
            onClick={() => { onClose(); setTimeout(() => document.querySelector<HTMLElement>('[data-add-doc]')?.click(), 100) }}
            style={{ padding: "0.6rem 1.25rem", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Add Documents ↓
          </button>
        </div>
      </div>
    </>
  )
}

// ── Modal: start estimate ─────────────────────────────────────────────────

function StartEstimateModal({
  bidId, bidName, documents, dropboxFolder, onClose, onSent,
}: {
  bidId: string; bidName: string; documents: DocEntry[]
  dropboxFolder: string; onClose: () => void; onSent: () => void
}) {
  const [folder, setFolder]         = useState(dropboxFolder)
  const [note, setNote]             = useState("")
  const [sending, setSending]       = useState(false)
  const hasHazmat = documents.some(d => d.type === "hazmat")

  async function handleSend() {
    setSending(true)
    try {
      await fetch(`/api/bids/${bidId}/send-to-clark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidName, dropboxFolder: folder, documents, extraNote: note }),
      })
      onSent()
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 101, background: "var(--bg)", borderRadius: "14px", border: "1px solid var(--border)",
        width: "min(520px, 94vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", padding: "1.5rem",
        display: "flex", flexDirection: "column", gap: "1.1rem",
      }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Start Estimate — Clark</p>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--ink)" }}>{bidName}</h2>
        </div>

        {/* Doc summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {[
            { type: "drawings",    label: "📐 Drawings",         req: true  },
            { type: "bid_docs",    label: "📋 Scope / Bid Docs", req: true  },
            { type: "hazmat",      label: "☣️ Hazmat Report",    req: false },
            { type: "quote_sheet", label: "💲 Quote Sheet",      req: false },
          ].map(({ type, label, req }) => {
            const present = documents.some(d => d.type === type)
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", color: present ? "var(--ink-muted)" : req ? "#c0392b" : "var(--ink-faint)" }}>
                <span>{present ? "✅" : req ? "🚩" : "○"}</span>
                <span>{label}</span>
                {!present && !req && <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>— Clark will flag as unconfirmed</span>}
              </div>
            )
          })}
        </div>

        {!hasHazmat && (
          <div style={{ padding: "0.7rem 0.9rem", background: "#fffbf0", border: "1px solid #e0c040", borderRadius: "7px", fontSize: "12px", color: "#92660a" }}>
            ⚠️ No hazmat report — Clark will assume ACM is unconfirmed and flag it. You can still proceed.
          </div>
        )}

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>Dropbox Folder</label>
          <input type="url" value={folder} onChange={e => setFolder(e.target.value)}
            placeholder="https://www.dropbox.com/sh/…"
            style={{ width: "100%", padding: "0.55rem 0.75rem", fontSize: "13px", fontFamily: "inherit", border: "1px solid var(--border)", borderRadius: "7px", background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "0.35rem" }}>Note to Clark</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. Focus on ACM scope. Tight margin target ~22%. Client wants 2-week turnaround."
            style={{ width: "100%", minHeight: "60px", padding: "0.55rem 0.75rem", fontSize: "13px", fontFamily: "inherit", border: "1px solid var(--border)", borderRadius: "7px", background: "var(--bg)", color: "var(--ink)", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", paddingTop: "0.25rem", borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{ padding: "0.6rem 1.1rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending}
            style={{ padding: "0.6rem 1.35rem", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : "📐 Start Clark →"}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EstimateStatusButton({
  bidId, bidName, documents, estimateData, dropboxFolder, bidStatus,
}: {
  bidId: string
  bidName: string
  documents: DocEntry[]
  estimateData: string | null
  dropboxFolder: string
  bidStatus: string
}) {
  const router = useRouter()
  const [modal, setModal] = useState<"missing" | "start" | null>(null)

  const state = getState(documents, estimateData, bidStatus)

  // Don't render anything for legacy closed bids with no estimate data
  if (state === "hidden") return null

  const cfg = STATE_CONFIG[state as Exclude<EstimateState, "hidden">]
  const missing  = getMissingDocs(documents)
  const flags    = getUnresolvedFlags(estimateData)
  const triggeredAt = getClarkTriggeredAt(estimateData)

  function handleClick() {
    if (cfg.disabled) return
    if (state === "no_quantities")                                   { setModal("missing"); return }
    if (state === "ready")                                           { setModal("start");   return }
    if (state === "clark_draft" || state === "approved" || state === "view_only") {
      router.push(`/bids/${bidId}/estimate`)
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
        <button
          onClick={handleClick}
          disabled={cfg.disabled}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            padding: "0.5rem 1.1rem",
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`,
            borderRadius: "7px", fontSize: "13px", fontWeight: 600,
            cursor: cfg.disabled ? "not-allowed" : "pointer",
            fontFamily: "inherit", whiteSpace: "nowrap",
            opacity: cfg.disabled ? 0.7 : 1,
            transition: "opacity 0.15s",
          }}>
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
          {state === "clark_draft" && flags > 0 && (
            <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.25)", padding: "1px 6px", borderRadius: "10px" }}>
              {flags} flag{flags > 1 ? "s" : ""}
            </span>
          )}
        </button>

        {/* Sub-label */}
        <p style={{ fontSize: "10px", color: "var(--ink-faint)", textAlign: "right", maxWidth: "180px", lineHeight: 1.4 }}>
          {state === "clark_working" && triggeredAt
            ? `Triggered ${new Date(triggeredAt).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`
            : cfg.description}
        </p>
      </div>

      {modal === "missing" && (
        <MissingDocsModal missing={missing} onClose={() => setModal(null)} bidId={bidId} />
      )}
      {modal === "start" && (
        <StartEstimateModal
          bidId={bidId} bidName={bidName} documents={documents}
          dropboxFolder={dropboxFolder}
          onClose={() => setModal(null)}
          onSent={() => { setModal(null); router.refresh() }}
        />
      )}
    </>
  )
}

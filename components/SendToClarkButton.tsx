"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

// ── Document classification ───────────────────────────────────────────────
// What Clark needs to begin an estimate
const DOC_META: Record<string, { label: string; icon: string; required: boolean; clarkNote: string }> = {
  drawings:    { label: "Drawings / Floor Plans", icon: "📐", required: true,  clarkNote: "Quantity takeoff source" },
  bid_docs:    { label: "Bid Documents / Scope",  icon: "📋", required: true,  clarkNote: "Scope of work definition" },
  hazmat:      { label: "Hazmat Report",          icon: "☣️", required: false, clarkNote: "ACM/LBP quantities + risk class" },
  quote_sheet: { label: "Quote Sheet",            icon: "💲", required: false, clarkNote: "Client's budget target" },
  addendum:    { label: "Addendum",               icon: "📎", required: false, clarkNote: "Scope changes" },
}

type DocEntry = { name: string; url: string; type: string }

function classifyDocs(docs: DocEntry[]) {
  const byType: Record<string, DocEntry[]> = {}
  const unclassified: DocEntry[] = []
  for (const doc of docs) {
    if (DOC_META[doc.type]) {
      if (!byType[doc.type]) byType[doc.type] = []
      byType[doc.type].push(doc)
    } else {
      unclassified.push(doc)
    }
  }
  return { byType, unclassified }
}

function getConfidence(byType: Record<string, DocEntry[]>, unclassified: DocEntry[]) {
  const hasDrawings = !!byType["drawings"]?.length
  const hasScope    = !!byType["bid_docs"]?.length
  const hasHazmat   = !!byType["hazmat"]?.length
  const hasUnknown  = unclassified.length > 0

  const missing: string[] = []
  const warnings: string[] = []
  const info: string[] = []

  if (!hasDrawings) missing.push("Drawings are required for quantity takeoff")
  if (!hasScope)    missing.push("Bid documents / scope letter needed")
  if (!hasHazmat)   warnings.push("No hazmat report — Clark will flag ACM as unconfirmed")
  if (hasUnknown)   warnings.push(`${unclassified.length} unclassified file${unclassified.length > 1 ? "s" : ""} — Clark may miss them`)
  if (hasHazmat)    info.push("Hazmat report present — ACM scope can be priced")

  const canProceed = hasDrawings && hasScope
  const isHighConf = canProceed && hasHazmat && !hasUnknown

  return { canProceed, isHighConf, missing, warnings, info }
}

export default function SendToClarkButton({
  bidId, bidName, documents, dropboxFolder,
}: {
  bidId: string
  bidName: string
  documents: DocEntry[]
  dropboxFolder: string
}) {
  const router = useRouter()
  const [open, setOpen]           = useState(false)
  const [folder, setFolder]       = useState(dropboxFolder || "")
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const [extraNote, setExtraNote] = useState("")

  const { byType, unclassified } = classifyDocs(documents)
  const { canProceed, isHighConf, missing, warnings, info } = getConfidence(byType, unclassified)

  async function handleSend() {
    setSending(true)
    try {
      await fetch(`/api/bids/${bidId}/send-to-clark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidName,
          dropboxFolder: folder,
          documents,
          extraNote,
        }),
      })
      setSent(true)
      setOpen(false)
      router.refresh()
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", background: "#f0faf4", border: "1px solid #3d8c5c", borderRadius: "7px", fontSize: "13px", color: "#3d8c5c", fontWeight: 500 }}>
        ✓ Clark on it
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "0.5rem 1rem", background: "var(--ink)", color: "var(--bg)", borderRadius: "7px", fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        🤖 Send to Clark
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 100 }} />

          {/* Modal */}
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 101, background: "var(--bg)", borderRadius: "14px", border: "1px solid var(--border)",
            width: "min(600px, 94vw)", maxHeight: "90vh", overflow: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "11px", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>Send to Clark</p>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em" }}>{bidName}</h2>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--ink-faint)", padding: "0.25rem" }}>✕</button>
            </div>

            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Confidence indicator */}
              <div style={{
                padding: "0.9rem 1.1rem", borderRadius: "10px",
                background: !canProceed ? "#fff5f5" : isHighConf ? "#f0faf4" : "#fffbf0",
                border: `1px solid ${!canProceed ? "#f5a0a0" : isHighConf ? "#3d8c5c" : "#e0c040"}`,
                display: "flex", alignItems: "center", gap: "0.75rem",
              }}>
                <span style={{ fontSize: "1.3rem" }}>{!canProceed ? "🚩" : isHighConf ? "✅" : "⚠️"}</span>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: !canProceed ? "#c0392b" : isHighConf ? "#3d8c5c" : "#92660a" }}>
                    {!canProceed
                      ? "Missing required documents — Clark can't start"
                      : isHighConf
                      ? "All key documents present — Clark can begin"
                      : "Proceed with caution — some documents missing or unverified"}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.2rem" }}>
                    {documents.length} document{documents.length !== 1 ? "s" : ""} attached to this bid
                  </p>
                </div>
              </div>

              {/* Document checklist */}
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.6rem" }}>Document Check</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {Object.entries(DOC_META).map(([type, meta]) => {
                    const docs = byType[type] || []
                    const present = docs.length > 0
                    return (
                      <div key={type} style={{
                        display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem",
                        background: present ? "var(--bg)" : meta.required ? "#fff5f5" : "var(--bg-subtle)",
                        border: `1px solid ${present ? "var(--border)" : meta.required ? "#f5a0a0" : "var(--border)"}`,
                        borderRadius: "7px",
                      }}>
                        <span style={{ fontSize: "1rem", flexShrink: 0 }}>{present ? "✅" : meta.required ? "🚩" : "○"}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: present ? "var(--ink)" : meta.required ? "#c0392b" : "var(--ink-faint)" }}>
                            {meta.icon} {meta.label}
                            {meta.required && !present && <span style={{ fontSize: "10px", marginLeft: "0.4rem", color: "#c0392b" }}>required</span>}
                          </span>
                          {present
                            ? <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.1rem" }}>{docs.map(d => d.name).join(", ")}</p>
                            : <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.1rem" }}>Not attached — {meta.clarkNote}</p>
                          }
                        </div>
                      </div>
                    )
                  })}

                  {/* Unclassified */}
                  {unclassified.map((doc, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem", background: "#fffbf0", border: "1px solid #e0c040", borderRadius: "7px" }}>
                      <span style={{ fontSize: "1rem" }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#92660a" }}>📄 {doc.name}</span>
                        <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.1rem" }}>Unclassified — Clark may not know how to use this</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing docs warnings */}
              {missing.length > 0 && (
                <div style={{ padding: "0.85rem 1rem", background: "#fff5f5", borderRadius: "8px", border: "1px solid #f5a0a0" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#c0392b", marginBottom: "0.4rem" }}>🚩 Blocking — add these before sending:</p>
                  {missing.map((m, i) => <p key={i} style={{ fontSize: "12px", color: "#c0392b" }}>• {m}</p>)}
                </div>
              )}
              {warnings.length > 0 && (
                <div style={{ padding: "0.85rem 1rem", background: "#fffbf0", borderRadius: "8px", border: "1px solid #e0c040" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#92660a", marginBottom: "0.4rem" }}>⚠️ Clark will flag these assumptions:</p>
                  {warnings.map((w, i) => <p key={i} style={{ fontSize: "12px", color: "#92660a" }}>• {w}</p>)}
                </div>
              )}

              {/* Dropbox folder */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "0.4rem" }}>
                  Dropbox Folder (Ean's folder for this bid)
                </label>
                <input
                  type="url"
                  value={folder}
                  onChange={e => setFolder(e.target.value)}
                  placeholder="https://www.dropbox.com/sh/…"
                  style={{ width: "100%", padding: "0.6rem 0.75rem", fontSize: "13px", fontFamily: "inherit", border: "1px solid var(--border)", borderRadius: "7px", background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
                />
                <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.35rem" }}>
                  Clark will reference this for any documents not already attached above
                </p>
              </div>

              {/* Extra note to Clark */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "0.4rem" }}>
                  Note to Clark (optional)
                </label>
                <textarea
                  value={extraNote}
                  onChange={e => setExtraNote(e.target.value)}
                  placeholder="e.g. Focus on ACM scope — clean demo is subtrade. Tight margin target, maybe 22%. Client wants 2-week turnaround."
                  style={{ width: "100%", minHeight: "70px", padding: "0.6rem 0.75rem", fontSize: "13px", fontFamily: "inherit", border: "1px solid var(--border)", borderRadius: "7px", background: "var(--bg)", color: "var(--ink)", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
                <button onClick={() => setOpen(false)} style={{ padding: "0.6rem 1.1rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                {!canProceed && (
                  <button
                    onClick={() => { setOpen(false); window.scrollTo(0, document.body.scrollHeight) }}
                    style={{ padding: "0.6rem 1.25rem", background: "var(--terra)", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Add Missing Docs First ↓
                  </button>
                )}
                {canProceed && (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{ padding: "0.6rem 1.25rem", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: sending ? 0.7 : 1 }}>
                    {sending ? "Sending to Clark…" : isHighConf ? "✓ Start Clark" : "Send to Clark Anyway"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

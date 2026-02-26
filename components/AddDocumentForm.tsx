"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const DOC_TYPES = [
  { value: "drawings",   label: "Drawings" },
  { value: "hazmat",     label: "Hazmat Report" },
  { value: "bid_docs",   label: "Bid Documents" },
  { value: "quote_sheet",label: "Quote Sheet" },
  { value: "addendum",   label: "Addendum" },
  { value: "other",      label: "Other" },
]

const input: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem",
  border: "1px solid var(--border)", borderRadius: "7px",
  fontSize: "13px", color: "var(--ink)", background: "var(--bg)",
  fontFamily: "inherit", outline: "none",
}

export default function AddDocumentForm({ bidId }: { bidId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [type, setType] = useState("drawings")
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/bids/${bidId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, type }),
      })
      setName(""); setUrl(""); setType("drawings"); setOpen(false)
      router.refresh()
    } catch {
      alert("Failed to add document")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.5rem 0.85rem", marginTop: "0.75rem",
          background: "transparent", border: "1px dashed var(--border)",
          borderRadius: "7px", fontSize: "13px", color: "var(--ink-faint)",
          cursor: "pointer", fontFamily: "inherit",
          width: "100%", justifyContent: "center",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink-muted)"; e.currentTarget.style.color = "var(--ink-muted)" }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--ink-faint)" }}
      >
        + Add Document
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{
      marginTop: "0.75rem", padding: "1rem 1.25rem",
      border: "1px solid var(--border)", borderRadius: "8px",
      background: "var(--bg-subtle)", display: "flex", flexDirection: "column", gap: "0.75rem",
    }}>
      <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Add Document</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={{ fontSize: "11px", color: "var(--ink-faint)", display: "block", marginBottom: "0.3rem" }}>Name</label>
          <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Architectural Drawings" required />
        </div>
        <div>
          <label style={{ fontSize: "11px", color: "var(--ink-faint)", display: "block", marginBottom: "0.3rem" }}>Type</label>
          <select style={{ ...input }} value={type} onChange={e => setType(e.target.value)}>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: "11px", color: "var(--ink-faint)", display: "block", marginBottom: "0.3rem" }}>URL (BuilderTrend, Google Drive, Dropbox, etc.)</label>
        <input style={input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." type="url" required />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: "0.5rem 1rem", background: "transparent", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "var(--ink-muted)" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{ padding: "0.5rem 1rem", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}

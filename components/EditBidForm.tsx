"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Bid {
  id: string
  project_name: string
  client: string
  client_id: string
  bid_value: number
  deadline: string
  margin_pct: number | null
  estimator: string
  notes: string
  status: string
}

const input: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem",
  border: "1px solid var(--border)", borderRadius: "7px",
  fontSize: "13px", color: "var(--ink)", background: "var(--bg)",
  fontFamily: "inherit", outline: "none",
}

const label: React.CSSProperties = {
  fontSize: "11px", color: "var(--ink-faint)",
  display: "block", marginBottom: "0.3rem", fontWeight: 500,
  letterSpacing: "0.04em", textTransform: "uppercase",
}

export default function EditBidForm({ bid, clients }: { bid: Bid; clients: any[] }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    project_name: bid.project_name,
    client:       bid.client,
    client_id:    bid.client_id || "",
    bid_value:    bid.bid_value,
    deadline:     bid.deadline?.slice(0, 10) ?? "",
    margin_pct:   bid.margin_pct ?? "",
    estimator:    bid.estimator || "JP",
    notes:        bid.notes || "",
  })

  function set(k: string, v: any) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    const c  = clients.find((c: any) => c.id === id)
    set("client_id", id)
    set("client", c?.name ?? "")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/bids/${bid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bid_value:  Number(form.bid_value),
          margin_pct: form.margin_pct !== "" ? Number(form.margin_pct) : null,
        }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        alert("Save failed — try again")
      }
    } catch {
      alert("Save failed — try again")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "0.5rem 1rem",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "7px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--ink-muted)",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "border-color 0.12s, color 0.12s",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ink-muted)"; e.currentTarget.style.color = "var(--ink)" }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--ink-muted)" }}
      >
        ✎ Edit
      </button>
    )
  }

  return (
    <form onSubmit={handleSave} style={{
      marginTop: "1.5rem",
      border: "1px solid var(--border)", borderRadius: "10px",
      background: "var(--bg-subtle)", padding: "1.5rem",
      display: "flex", flexDirection: "column", gap: "1rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Edit Bid</p>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--ink-faint)", lineHeight: 1 }}>×</button>
      </div>

      {/* Row 1: Name + Client */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={label}>Project Name</label>
          <input style={input} value={form.project_name} onChange={e => set("project_name", e.target.value)} required />
        </div>
        <div>
          <label style={label}>Client</label>
          <select style={{ ...input }} value={form.client_id} onChange={handleClientChange}>
            <option value="">— select —</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Value + Deadline + Margin */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={label}>Bid Value ($)</label>
          <input style={input} type="number" value={form.bid_value} onChange={e => set("bid_value", e.target.value)} required min={0} />
        </div>
        <div>
          <label style={label}>Deadline</label>
          <input style={input} type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} required />
        </div>
        <div>
          <label style={label}>Margin % (if won)</label>
          <input style={input} type="number" value={form.margin_pct} onChange={e => set("margin_pct", e.target.value)} min={0} max={100} placeholder="—" />
        </div>
      </div>

      {/* Row 3: Estimator */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
        <div>
          <label style={label}>Estimator</label>
          <input style={input} value={form.estimator} onChange={e => set("estimator", e.target.value)} />
        </div>
        <div>
          <label style={label}>Notes</label>
          <input style={input} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Scope notes, conditions, flags…" />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", paddingTop: "0.25rem" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: "0.55rem 1.25rem", background: "transparent", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", color: "var(--ink-muted)" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{ padding: "0.55rem 1.25rem", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  )
}

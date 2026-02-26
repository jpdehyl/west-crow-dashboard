"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const today = () => new Date().toISOString().split('T')[0]

const inp: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.85rem",
  background: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: "7px", fontSize: "13px", color: "var(--ink)",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
}
const lbl: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 500,
  letterSpacing: "0.07em", textTransform: "uppercase",
  color: "var(--ink-faint)", marginBottom: "0.35rem",
}

export default function CostForm({ projectId }: { projectId: string }) {
  const router  = useRouter()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)

  const [form, setForm] = useState({
    date: today(), description: '', amount: '', category: 'labour', vendor: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`/api/projects/${projectId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false); router.refresh() }, 1000)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.55rem 1.1rem", background: "var(--bg-subtle)",
        border: "1px solid var(--border)", color: "var(--ink)",
        borderRadius: "8px", fontSize: "13px", fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit",
      }}>
        + Add Cost
      </button>
    )
  }

  return (
    <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Add Cost Entry</p>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: "16px" }}>×</button>
      </div>

      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={lbl}>Amount (CAD) <span style={{ color: "var(--terra)" }}>*</span></label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="2500" min="0" step="0.01" style={inp} required />
          </div>
          <div>
            <label style={lbl}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="labour">Labour</option>
              <option value="materials">Materials</option>
              <option value="equipment">Equipment</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Vendor</label>
            <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Vendor name" style={inp} />
          </div>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={lbl}>Description <span style={{ color: "var(--terra)" }}>*</span></label>
          <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Oscar — 3 days labour" style={inp} required />
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" onClick={() => setOpen(false)} style={{ fontSize: "13px", color: "var(--ink-muted)", padding: "0.55rem 1rem", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="submit" disabled={loading || saved} style={{ padding: "0.55rem 1.25rem", background: saved ? "var(--sage)" : "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saved ? "Saved ✓" : loading ? "Saving…" : "Save Cost"}
          </button>
        </div>
      </form>
    </div>
  )
}

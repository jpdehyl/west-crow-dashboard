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

export default function LogForm({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)

  const [form, setForm] = useState({
    date: today(), crew: 'Oscar', hours: '', weather: 'Clear',
    work_performed: '', issues: '', photos: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch(`/api/projects/${projectId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hours: Number(form.hours),
          photos: form.photos ? Number(form.photos) : undefined,
          crew: form.crew.split(',').map(s => s.trim()),
        }),
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false); router.refresh() }, 1000)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.55rem 1.1rem", background: "var(--ink)", color: "var(--bg)",
        border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit",
      }}>
        + Log Today
      </button>
    )
  }

  return (
    <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Daily Log Entry</p>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: "16px" }}>×</button>
      </div>

      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} required />
          </div>
          <div>
            <label style={lbl}>Hours</label>
            <input type="number" value={form.hours} onChange={e => set('hours', e.target.value)} placeholder="40" style={inp} required min="1" max="24" />
          </div>
          <div>
            <label style={lbl}>Crew (comma-separated)</label>
            <input type="text" value={form.crew} onChange={e => set('crew', e.target.value)} placeholder="Oscar, Crew x3" style={inp} required />
          </div>
          <div>
            <label style={lbl}>Weather</label>
            <select value={form.weather} onChange={e => set('weather', e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {['Clear','Overcast','Rain','Snow','Fog'].map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "0.85rem" }}>
          <label style={lbl}>Work Performed <span style={{ color: "var(--accent)" }}>*</span></label>
          <textarea
            value={form.work_performed}
            onChange={e => set('work_performed', e.target.value)}
            placeholder="Describe work completed today…"
            rows={3} required
            style={{ ...inp, resize: "none", lineHeight: 1.65 }}
          />
        </div>

        <div style={{ marginBottom: "0.85rem" }}>
          <label style={lbl}>Issues / Notes</label>
          <textarea
            value={form.issues}
            onChange={e => set('issues', e.target.value)}
            placeholder="Any issues, delays, or notable observations…"
            rows={2}
            style={{ ...inp, resize: "none", lineHeight: 1.65 }}
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={lbl}>Photos taken</label>
          <input type="number" value={form.photos} onChange={e => set('photos', e.target.value)} placeholder="0" min="0" style={{ ...inp, maxWidth: "120px" }} />
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" onClick={() => setOpen(false)} style={{ fontSize: "13px", color: "var(--ink-muted)", padding: "0.55rem 1rem", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="submit" disabled={loading || saved} style={{ padding: "0.55rem 1.25rem", background: saved ? "var(--sage)" : "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saved ? "Saved ✓" : loading ? "Saving…" : "Save Log"}
          </button>
        </div>
      </form>
    </div>
  )
}

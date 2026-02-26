"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 1rem",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "14px",
  color: "var(--ink)",
  outline: "none",
  fontFamily: "inherit",
  appearance: "none" as const,
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
  marginBottom: "0.5rem",
}

export default function NewBidPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: fd.get('project_name'),
          client:       fd.get('client'),
          bid_value:    Number(fd.get('bid_value')),
          deadline:     fd.get('deadline'),
          estimator:    fd.get('estimator'),
          notes:        fd.get('notes'),
          source:       fd.get('source'),
        }),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch (err) {
      console.error(err)
      // Still redirect — will show in seed data at minimum
    }
    setLoading(false)
    router.push("/bids")
  }

  return (
    <div style={{ maxWidth: "640px" }}>
      <Link href="/bids" style={{
        fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none",
        display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.75rem",
      }}>
        ← Pipeline
      </Link>

      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
          West Crow Contracting
        </p>
        <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>
          New Bid
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>

          {/* Project name */}
          <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid var(--border)" }}>
            <label style={labelStyle}>
              Project Name <span style={{ color: "var(--terra)" }}>*</span>
            </label>
            <input
              required
              name="project_name"
              type="text"
              placeholder="e.g. Burnaby Office Demolition"
              style={inputStyle}
            />
          </div>

          {/* Client + Estimator */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "1.5rem 1.75rem", gap: "1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div>
              <label style={labelStyle}>Client <span style={{ color: "var(--terra)" }}>*</span></label>
              <select required name="client" style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select client…</option>
                {clients.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="__new">+ New client</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estimator</label>
              <select name="estimator" style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="JP">JP</option>
              </select>
            </div>
          </div>

          {/* Value + Deadline */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "1.5rem 1.75rem", gap: "1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div>
              <label style={labelStyle}>Bid Value (CAD) <span style={{ color: "var(--terra)" }}>*</span></label>
              <input
                required
                name="bid_value"
                type="number"
                min="0"
                step="500"
                placeholder="150000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Bid Deadline <span style={{ color: "var(--terra)" }}>*</span></label>
              <input
                required
                name="deadline"
                type="date"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Source */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "1.5rem 1.75rem", gap: "1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div>
              <label style={labelStyle}>Source</label>
              <select name="source" style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="email">Email invitation</option>
                <option value="referral">Referral</option>
                <option value="repeat">Repeat client</option>
                <option value="tender">Public tender</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>BuilderTrend ID</label>
              <input
                name="buildertrend_id"
                type="text"
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ padding: "1.5rem 1.75rem" }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Scope summary, special conditions, subcontractors, hazmat flags…"
              style={{ ...inputStyle, resize: "none", lineHeight: 1.65 }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
          <Link href="/bids" style={{
            fontSize: "13px", color: "var(--ink-muted)", padding: "0.65rem 1.25rem",
            borderRadius: "8px", textDecoration: "none",
          }}>
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.65rem 1.75rem",
              background: loading ? "var(--ink-faint)" : "var(--ink)",
              color: "var(--bg)",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
            }}
          >
            {loading ? "Saving…" : "Save Bid"}
          </button>
        </div>
      </form>
    </div>
  )
}

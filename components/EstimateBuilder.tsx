"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_SECTIONS, DEFAULT_SUBTRADES, DEFAULT_CONFIG,
  type Section, type SubtradeItem, type EstimateConfig, type LineItem,
  type EstimateMeta, type Assumption, type AssumptionSeverity,
} from "@/lib/estimate-data"

const SEV_STYLE: Record<AssumptionSeverity, { bg: string; color: string; label: string; icon: string }> = {
  flag:  { bg: "#fff5f5", color: "#c0392b", label: "Flag",  icon: "🚩" },
  warn:  { bg: "#fffbf0", color: "#b8860b", label: "Warn",  icon: "⚠️" },
  info:  { bg: "#f0f7ff", color: "#2563eb", label: "Info",  icon: "ℹ️" },
}

const DEFAULT_META: EstimateMeta = {
  status: "clark_draft",
  clark_notes: "",
  prepared_by: "Clark",
  prepared_at: new Date().toISOString(),
  assumptions: [],
}

// ── Calculation ─────────────────────────────────────────────────────────────
// ⚠️ Clark's rule: has_material=false for Mob (010001) and Demob (010315)
// Formula: ManDays × $296 + Material(18% if applicable) → × 1.42 (12% OH + 30% profit, additive)

function calcItem(item: LineItem, cfg: EstimateConfig) {
  const { units, units_per_day, has_material } = item
  const manDays     = units_per_day > 0 ? units / units_per_day : 0
  const labour      = manDays * cfg.cost_per_man_day
  const materialCost= has_material ? labour * (cfg.material_pct / 100) : 0
  const totalCost   = labour + materialCost
  const overhead    = totalCost * (cfg.overhead_pct / 100)
  const profit      = totalCost * (cfg.profit_pct  / 100)
  const total       = totalCost + overhead + profit
  const rpu         = units > 0 ? total / units : 0
  return { manDays, labour, materialCost, totalCost, overhead, profit, total, rpu }
}

// Subtrade item: flat unit_cost × units → raw total → × (1 + markup%)
function calcSubtrade(item: SubtradeItem, markupPct: number) {
  const raw   = item.units * item.unit_cost
  const total = raw * (1 + markupPct / 100)
  return { raw, total }
}

function deHylForces(sections: Section[], cfg: EstimateConfig) {
  return sections.flatMap(s => s.items)
    .filter(i => i.active && i.units > 0)
    .reduce((sum, i) => sum + calcItem(i, cfg).total, 0)
}

function subtradesTotal(subs: SubtradeItem[], markupPct: number) {
  return subs
    .filter(s => s.active && s.units > 0)
    .reduce((sum, s) => sum + calcSubtrade(s, markupPct).total, 0)
}

// ── Formatting ───────────────────────────────────────────────────────────────

const $ = (n: number) => n === 0 ? "—" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n)
const dec = (n: number, d = 2) => n === 0 ? "—" : n.toFixed(d)

// ── Styles ───────────────────────────────────────────────────────────────────

const cell: React.CSSProperties = { padding: "0.45rem 0.65rem", fontSize: "12px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", verticalAlign: "middle" }
const numCell: React.CSSProperties = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-muted)" }
const calcCell: React.CSSProperties = { ...numCell, color: "var(--ink-faint)" }
const inputStyle: React.CSSProperties = {
  width: "80px", padding: "0.3rem 0.4rem", border: "1px solid var(--border)", borderRadius: "5px",
  fontSize: "12px", fontFamily: "inherit", background: "var(--bg)", color: "var(--ink)", textAlign: "right",
}

// ── Component ────────────────────────────────────────────────────────────────


// ── ApprovedPanel ─────────────────────────────────────────────────────────────

interface DraftResult {
  draft_id: string
  gmail_url: string
  scheduled_for: string | null
  to: string | null
  no_gc_email: boolean
  subject: string
  email_preview: string
}

function ApprovedPanel({
  bidId, grandTotal, estimateNumber, meta, setMeta
}: {
  bidId: string
  grandTotal: number
  estimateNumber: string
  meta: EstimateMeta
  setMeta: (fn: (m: EstimateMeta) => EstimateMeta) => void
}) {
  const [uploading, setUploading]     = useState(false)
  const [uploadResult, setUploadResult] = useState<{ path: string; filename: string } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [drafting, setDrafting]       = useState(false)
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null)
  const [draftError, setDraftError]   = useState<string | null>(null)

  const fmtTotal = new Intl.NumberFormat("en-CA", {
    style: "currency", currency: "CAD", minimumFractionDigits: 2,
  }).format(grandTotal)

  function handleDownload() {
    window.open(`/api/bids/${bidId}/proposal`, "_blank")
  }

  async function handleUpload() {
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)
    setDraftResult(null)
    try {
      const res = await fetch(`/api/bids/${bidId}/proposal/upload`, { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Upload failed")
      setUploadResult({ path: json.dropbox_path, filename: json.filename })
    } catch (e: any) {
      setUploadError(e.message ?? "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleDraftEmail() {
    setDrafting(true)
    setDraftError(null)
    setDraftResult(null)
    try {
      const res = await fetch(`/api/bids/${bidId}/draft-email`, { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Draft creation failed")
      setDraftResult(json)
    } catch (e: any) {
      setDraftError(e.message ?? "Draft creation failed")
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      {/* Approved status bar */}
      <div style={{ padding: "0.85rem 1.25rem", background: "#f0faf4", border: "1px solid #3d8c5c", borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ color: "#3d8c5c", fontSize: "1.1rem" }}>✓</span>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "#3d8c5c", flex: 1 }}>
          Approved by JP{meta.approved_at ? ` · ${new Date(meta.approved_at).toLocaleDateString("en-CA")}` : ""} — Ready to send
          {estimateNumber && <span style={{ marginLeft: "0.5rem", fontSize: "12px", color: "#3d8c5c", fontWeight: 400 }}>· {estimateNumber}</span>}
        </p>
        <button
          onClick={() => setMeta(m => ({ ...m, status: "clark_draft" }))}
          style={{ fontSize: "12px", color: "#3d8c5c", background: "none", border: "1px solid #3d8c5c", borderRadius: "6px", padding: "0.3rem 0.75rem", cursor: "pointer", fontFamily: "inherit" }}>
          Reopen
        </button>
      </div>

      {/* Proposal actions panel */}
      <div style={{ padding: "1rem 1.25rem", background: "#fafffe", border: "1px solid #3d8c5c", borderTop: "none", borderRadius: "0 0 10px 10px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#3d8c5c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
          📄 Proposal Actions
        </p>

        {/* Step 1: Download + Upload */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <button
            onClick={handleDownload}
            style={{ padding: "0.55rem 1.1rem", background: "#2d2d2d", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            📄 Download Proposal PDF
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{ padding: "0.55rem 1.1rem", background: uploading ? "#aaa" : "#1d6fa5", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: uploading ? 0.7 : 1 }}>
            {uploading ? "Uploading…" : "☁️ Upload to Dropbox"}
          </button>
        </div>

        {/* Upload feedback */}
        {uploadError && (
          <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.85rem", background: "#fff5f5", border: "1px solid #f87171", borderRadius: "7px", fontSize: "12px", color: "#b91c1c" }}>
            ⚠️ {uploadError}
          </div>
        )}

        {uploadResult && (
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ padding: "0.6rem 0.85rem", background: "#f0faf4", border: "1px solid #6ee7b7", borderRadius: "7px", fontSize: "12px", color: "#065f46", marginBottom: "0.6rem" }}>
              ✓ Saved to Dropbox: <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{uploadResult.path}</span>
            </div>

            {/* Step 2: Draft email via Clark */}
            <div style={{ padding: "0.85rem 1rem", background: "#f8f4ff", border: "1px solid #a78bfa", borderRadius: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                ✉️ Email to GC
              </p>
              <p style={{ fontSize: "12px", color: "#5b21b6", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                Clark will write the email, attach the PDF, and create a Gmail draft — ready for your review.
              </p>
              <button
                onClick={handleDraftEmail}
                disabled={drafting}
                style={{ padding: "0.6rem 1.2rem", background: drafting ? "#aaa" : "#7c3aed", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: drafting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {drafting ? (
                  <>
                    <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Clark is drafting the email…
                  </>
                ) : "✉️ Send to GC via Clark"}
              </button>

              {/* Draft error */}
              {draftError && (
                <div style={{ marginTop: "0.6rem", padding: "0.6rem 0.85rem", background: "#fff5f5", border: "1px solid #f87171", borderRadius: "7px", fontSize: "12px", color: "#b91c1c" }}>
                  ⚠️ {draftError}
                </div>
              )}

              {/* Draft success */}
              {draftResult && (
                <div style={{ marginTop: "0.75rem" }}>
                  <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "7px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#14532d", marginBottom: "0.3rem" }}>
                      ✅ {draftResult.scheduled_for
                        ? `Scheduled for ${new Date(draftResult.scheduled_for).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                        : "Gmail draft created"}
                    </p>
                    {draftResult.no_gc_email && (
                      <p style={{ fontSize: "11px", color: "#b45309", marginBottom: "0.3rem" }}>
                        ⚠️ No GC email on file — draft has empty To: field. Add gc_email to the bid.
                      </p>
                    )}
                    {draftResult.to && (
                      <p style={{ fontSize: "11px", color: "#166534", marginBottom: "0.3rem" }}>
                        To: {draftResult.to}
                      </p>
                    )}
                    <p style={{ fontSize: "11px", color: "#166534", marginBottom: "0.5rem", fontStyle: "italic" }}>
                      {draftResult.email_preview?.slice(0, 120)}…
                    </p>
                    <a
                      href={draftResult.gmail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-block", padding: "0.4rem 0.9rem", background: "#1a73e8", color: "#fff", borderRadius: "6px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                      → Open in Gmail
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

type ClarkPricedLineItem = { description: string; man_days: number | null; total: number }

export default function EstimateBuilder({ bidId, bidName, saved, estimateSheetUrl }: { bidId: string; bidName: string; saved: any; estimateSheetUrl?: string | null }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [estimateNumber, setEstimateNumber] = useState<string | null>(saved?.estimate_number ?? null)
  const [cfg, setCfg] = useState<EstimateConfig>(saved?.config ?? DEFAULT_CONFIG)
  const [sections, setSections] = useState<Section[]>(() => {
    if (!saved?.sections) return DEFAULT_SECTIONS
    return DEFAULT_SECTIONS.map(def => {
      const s = saved.sections.find((x: any) => x.id === def.id)
      if (!s) return def
      return {
        ...def,
        expanded: s.expanded ?? def.expanded,
        items: def.items.map(di => {
          const si = s.items?.find((x: any) => x.id === di.id)
          return si ? {
            ...di,
            units: Number(si.units) || 0,
            units_per_day: Number(si.units_per_day) || di.units_per_day,
            has_material: si.has_material !== undefined ? si.has_material : di.has_material,
            active: si.active !== false,
            notes: si.notes || "",
          } : di
        }),
      }
    })
  })
  const [subtrades, setSubtrades] = useState<SubtradeItem[]>(() => {
    if (!saved?.subtrades) return DEFAULT_SUBTRADES
    return DEFAULT_SUBTRADES.map(def => {
      const s = saved.subtrades?.find((x: any) => x.id === def.id)
      return s ? { ...def, units: Number(s.units) || 0, unit_cost: Number(s.unit_cost) || def.unit_cost, active: s.active !== false, notes: s.notes || "" } : def
    })
  })
  const [meta, setMeta] = useState<EstimateMeta>(saved?.meta ?? DEFAULT_META)

  const clarkLineItems: ClarkPricedLineItem[] = Array.isArray(saved?.clark_draft?.line_items)
    ? saved.clark_draft.line_items
    : []
  const recommendedRow = clarkLineItems.find((item) => item.description?.toUpperCase().includes("TOTAL RECOMMENDED BID"))
  const labourScopeRow = clarkLineItems.find((item) => item.description?.toUpperCase().includes("LABOUR SCOPE TOTAL"))
  const recommendedTotal = typeof recommendedRow?.total === "number" ? recommendedRow.total : null

  const dfTotal = deHylForces(sections, cfg)
  const stTotal = subtradesTotal(subtrades, cfg.subtrade_markup)
  const gt      = dfTotal + stTotal
  const displayTotal = recommendedTotal ?? gt

  function updateItem(secId: string, itemId: string, field: string, value: any) {
    setSections(prev => prev.map(s =>
      s.id !== secId ? s : {
        ...s,
        items: s.items.map(i => i.id !== itemId ? i : { ...i, [field]: value })
      }
    ))
  }

  function updateSub(subId: string, field: string, value: any) {
    setSubtrades(prev => prev.map(s => s.id !== subId ? s : { ...s, [field]: value }))
  }

  function toggleSection(secId: string) {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, expanded: !s.expanded } : s))
  }

  function sectionTotal(sec: Section) {
    return sec.items.filter(i => i.active && i.units > 0)
      .reduce((sum, i) => sum + calcItem(i, cfg).total, 0)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/bids/${bidId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, sections, subtrades, meta, grand_total: displayTotal }),
      })
      const json = await res.json()
      if (json.estimate_number) setEstimateNumber(json.estimate_number)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    const approved: EstimateMeta = {
      ...meta,
      status: "approved",
      approved_by: "JP",
      approved_at: new Date().toISOString(),
      assumptions: meta.assumptions.map(a => ({ ...a, resolved: true })),
    }
    setMeta(approved)
    setSaving(true)
    try {
      await fetch(`/api/bids/${bidId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, sections, subtrades, meta: approved, grand_total: displayTotal }),
      })
    } finally {
      setSaving(false)
    }
  }

  const unresolvedFlags = meta.assumptions.filter(a => !a.resolved && a.severity === "flag").length
  const unresolvedWarns = meta.assumptions.filter(a => !a.resolved && a.severity === "warn").length

  async function handleApply() {
    setApplying(true)
    try {
      await fetch(`/api/bids/${bidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid_value: Math.round(displayTotal) }),
      })
      router.push(`/bids/${bidId}`)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "11px", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>Estimate</p>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em" }}>{bidName}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "0.55rem 1.1rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={handleApply} disabled={applying || displayTotal === 0} style={{ padding: "0.55rem 1.25rem", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: applying || displayTotal === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: applying || displayTotal === 0 ? 0.6 : 1 }}>
            {applying ? "Applying…" : `Apply ${$(displayTotal)} → Bid Value`}
          </button>
        </div>
      </div>

      {/* ── Clark Review Banner ── */}
      {meta.status === "clark_draft" && (
        <div style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem", background: "#fffbf0", border: "1px solid #f0d060", borderRadius: "10px", display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "1.25rem" }}>📐</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#92660a", marginBottom: "0.2rem" }}>
              Clark Draft — Pending Your Review
            </p>
            <p style={{ fontSize: "12px", color: "#b8860b" }}>
              {unresolvedFlags > 0 && `${unresolvedFlags} flag${unresolvedFlags > 1 ? "s" : ""} need your decision. `}
              {unresolvedWarns > 0 && `${unresolvedWarns} warning${unresolvedWarns > 1 ? "s" : ""}. `}
              Review assumptions below before approving.
            </p>
          </div>
          <button
            onClick={handleApprove}
            disabled={saving || unresolvedFlags > 0}
            title={unresolvedFlags > 0 ? "Resolve all 🚩 flags before approving" : "Approve Clark's estimate"}
            style={{ padding: "0.55rem 1.25rem", background: unresolvedFlags > 0 ? "#e8e1d6" : "#3d8c5c", color: unresolvedFlags > 0 ? "#999" : "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: unresolvedFlags > 0 ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            {unresolvedFlags > 0 ? `${unresolvedFlags} flag${unresolvedFlags > 1 ? "s" : ""} remaining` : "✓ Approve Estimate"}
          </button>
        </div>
      )}
      {meta.status === "approved" && (
        <ApprovedPanel bidId={bidId} grandTotal={displayTotal} estimateNumber={estimateNumber ?? ""} meta={meta} setMeta={setMeta} />
      )}

      {/* ── Clark Notes ── */}
      {(meta.clark_notes || meta.status === "clark_draft") && (
        <div style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>📝 Clark's Notes</p>
          <textarea
            value={meta.clark_notes}
            onChange={e => setMeta(m => ({ ...m, clark_notes: e.target.value }))}
            placeholder="Clark will fill this in — scope summary, key risks, anything JP should know before reviewing…"
            style={{ width: "100%", minHeight: "64px", padding: "0.6rem 0.75rem", fontSize: "13px", fontFamily: "inherit", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "7px", color: "var(--ink)", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }}
          />
        </div>
      )}


      {/* ── Clark Summary Table ── */}
      {clarkLineItems.length > 0 && (
        <div style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", gap: "0.8rem", flexWrap: "wrap" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Priced Summary</p>
            {estimateSheetUrl && (
              <a href={estimateSheetUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                📊 Open in Google Sheets
              </a>
            )}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ ...cell, textAlign: "left", fontSize: "10px", textTransform: "uppercase", color: "var(--ink-faint)" }}>Description</th>
                <th style={{ ...numCell, fontSize: "10px", textTransform: "uppercase", color: "var(--ink-faint)" }}>Man-Days</th>
                <th style={{ ...numCell, fontSize: "10px", textTransform: "uppercase", color: "var(--ink-faint)" }}>Total $</th>
              </tr>
            </thead>
            <tbody>
              {clarkLineItems.map((item, idx) => {
                const isBold = item === labourScopeRow || item === recommendedRow
                return (
                  <tr key={`${item.description}-${idx}`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ ...cell, color: "var(--ink)" }}>{item.description}</td>
                    <td style={numCell}>{typeof item.man_days === "number" ? dec(item.man_days) : ""}</td>
                    <td style={{ ...numCell, fontWeight: isBold ? 700 : 500, color: isBold ? "var(--ink)" : "var(--ink-muted)" }}>{$(item.total ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Assumptions & Flags ── */}
      {meta.assumptions.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.6rem" }}>
            Assumptions & Flags ({meta.assumptions.filter(a => !a.resolved).length} unresolved)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {meta.assumptions.map((a) => {
              const sty = SEV_STYLE[a.severity]
              return (
                <div key={a.id} style={{
                  display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.75rem 1rem",
                  background: a.resolved ? "var(--bg-subtle)" : sty.bg,
                  border: `1px solid ${a.resolved ? "var(--border)" : sty.color + "44"}`,
                  borderRadius: "8px", opacity: a.resolved ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "1px" }}>{sty.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", color: a.resolved ? "var(--ink-faint)" : sty.color, fontWeight: 500, marginBottom: "0.2rem", textDecoration: a.resolved ? "line-through" : "none" }}>
                      {a.text}
                    </p>
                    {a.source && (
                      <p style={{ fontSize: "11px", color: "var(--ink-faint)", fontStyle: "italic" }}>Source: {a.source}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setMeta(m => ({ ...m, assumptions: m.assumptions.map(x => x.id === a.id ? { ...x, resolved: !x.resolved } : x) }))}
                    style={{ fontSize: "11px", padding: "0.3rem 0.65rem", background: a.resolved ? "var(--border)" : sty.color, color: a.resolved ? "var(--ink-faint)" : "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {a.resolved ? "Unresolve" : "Resolve ✓"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Rate Config ── */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", padding: "0.85rem 1.25rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Rates</span>
        {([
          { key: "cost_per_man_day", label: "$/Man-Day", prefix: "$", suffix: "",  step: 1   },
          { key: "material_pct",     label: "Material %", prefix: "",  suffix: "%", step: 0.5 },
          { key: "overhead_pct",     label: "Overhead %", prefix: "",  suffix: "%", step: 0.5 },
          { key: "profit_pct",       label: "Profit %",   prefix: "",  suffix: "%", step: 0.5 },
        ] as const).map(({ key, label, prefix, suffix, step }) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "12px", color: "var(--ink-muted)" }}>
            {label}
            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
              {prefix ? <span style={{ fontSize: "11px" }}>{prefix}</span> : null}
              <input
                type="number" step={step} min={0}
                value={cfg[key]}
                onChange={e => setCfg(c => ({ ...c, [key]: Number(e.target.value) }))}
                style={{ ...inputStyle, width: key === "cost_per_man_day" ? "70px" : "52px" }}
              />
              {suffix ? <span style={{ fontSize: "11px" }}>{suffix}</span> : null}
            </div>
          </label>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--ink-faint)" }}>
          Material % not applied to Mob/Demob
        </span>
      </div>

      {/* ── Sections ── */}
      {sections.map(sec => {
        const secTotal = sectionTotal(sec)
        const activeCount = sec.items.filter(i => i.active && i.units > 0).length
        return (
          <div key={sec.id} style={{ marginBottom: "0.75rem", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>

            {/* Section header */}
            <button onClick={() => toggleSection(sec.id)} style={{
              display: "flex", alignItems: "center", width: "100%", padding: "0.75rem 1.25rem",
              background: "var(--bg-subtle)", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              borderBottom: sec.expanded ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", flex: 1 }}>
                {sec.expanded ? "▾" : "▸"} {sec.name}
              </span>
              {activeCount > 0 && (
                <span style={{ fontSize: "12px", color: "var(--ink-faint)", marginRight: "1.5rem" }}>
                  {activeCount} item{activeCount > 1 ? "s" : ""}
                </span>
              )}
              <span style={{ fontSize: "13px", fontWeight: 600, color: secTotal > 0 ? "var(--ink)" : "var(--ink-faint)", minWidth: "90px", textAlign: "right" }}>
                {secTotal > 0 ? $(secTotal) : "—"}
              </span>
            </button>

            {/* Table */}
            {sec.expanded && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-subtle)" }}>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", width: 24 }}></th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "left" }}>Description</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Units</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Unit</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Rate/Day</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Man Days</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Labour</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Material</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Subtotal</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>OH+Profit</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Total</th>
                      <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>$/Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map(item => {
                      const c = calcItem(item, cfg)
                      const hasValue = item.units > 0 && item.active
                      return (
                        <tr key={item.id} style={{ background: item.active ? "var(--bg)" : "var(--bg-subtle)", opacity: item.active ? 1 : 0.5 }}>

                          {/* Active toggle */}
                          <td style={{ ...cell, textAlign: "center" }}>
                            <input type="checkbox" checked={item.active}
                              onChange={e => updateItem(sec.id, item.id, "active", e.target.checked)}
                              style={{ cursor: "pointer" }} />
                          </td>

                          {/* Description */}
                          <td style={{ ...cell, color: "var(--ink)", fontWeight: 400 }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span>{item.description}</span>
                                {!item.has_material && (
                                  <span style={{ fontSize: "9px", padding: "1px 5px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--ink-faint)", letterSpacing: "0.05em" }}>no mat.</span>
                                )}
                              </div>
                              <span style={{ fontSize: "10px", color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}>{item.phase_code}</span>
                            </div>
                          </td>

                          {/* Units input */}
                          <td style={{ ...cell, textAlign: "right" }}>
                            <input
                              type="number" min={0} step={1}
                              value={item.units || ""}
                              placeholder="0"
                              onChange={e => updateItem(sec.id, item.id, "units", Number(e.target.value))}
                              style={inputStyle}
                            />
                          </td>

                          {/* Unit type */}
                          <td style={{ ...calcCell }}>{item.unit_type}</td>

                          {/* Units per day input */}
                          <td style={{ ...cell, textAlign: "right" }}>
                            <input
                              type="number" min={0.01} step={1}
                              value={item.units_per_day || ""}
                              onChange={e => updateItem(sec.id, item.id, "units_per_day", Number(e.target.value))}
                              style={inputStyle}
                            />
                          </td>

                          {/* Calculated columns */}
                          <td style={{ ...calcCell }}>{hasValue ? dec(c.manDays) : "—"}</td>
                          <td style={{ ...calcCell }}>{hasValue ? $(c.labour) : "—"}</td>
                          <td style={{ ...calcCell }}>{hasValue ? $(c.materialCost) : "—"}</td>
                          <td style={{ ...calcCell }}>{hasValue ? $(c.totalCost) : "—"}</td>
                          <td style={{ ...calcCell }}>{hasValue ? $(c.overhead + c.profit) : "—"}</td>
                          <td style={{ ...numCell, fontWeight: 600, color: hasValue ? "var(--sage)" : "var(--ink-faint)" }}>
                            {hasValue ? $(c.total) : "—"}
                          </td>
                          <td style={{ ...calcCell }}>{hasValue && c.rpu > 0 ? `$${c.rpu.toFixed(2)}` : "—"}</td>
                        </tr>
                      )
                    })}

                    {/* Section total row */}
                    {secTotal > 0 && (
                      <tr style={{ background: "var(--bg-subtle)", borderTop: "2px solid var(--border)" }}>
                        <td colSpan={10} style={{ ...cell, textAlign: "right", fontWeight: 500, color: "var(--ink-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {sec.name} Total
                        </td>
                        <td style={{ ...numCell, fontWeight: 700, color: "var(--ink)", fontSize: "13px" }}>{$(secTotal)}</td>
                        <td style={calcCell}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}

      {/* ── Subtrades Section ── */}
      <div style={{ marginBottom: "0.75rem", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", width: "100%", padding: "0.75rem 1.25rem",
          background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", flex: 1 }}>
            Subtrades &amp; Costs
          </span>
          <span style={{ fontSize: "11px", color: "var(--ink-faint)", marginRight: "1rem" }}>
            +{cfg.subtrade_markup}% markup
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: stTotal > 0 ? "var(--ink)" : "var(--ink-faint)", minWidth: "90px", textAlign: "right" }}>
            {stTotal > 0 ? $(stTotal) : "—"}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", width: 24 }}></th>
                <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "left" }}>Description</th>
                <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Qty</th>
                <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Unit</th>
                <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Unit Cost</th>
                <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>Raw</th>
                <th style={{ ...cell, fontWeight: 500, color: "var(--sage)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "right" }}>w/ {cfg.subtrade_markup}% mkp</th>
                <th style={{ ...cell, fontWeight: 500, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "10px", textAlign: "left" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {subtrades.map(s => {
                const cs = calcSubtrade(s, cfg.subtrade_markup)
                const hasValue = s.units > 0 && s.active
                return (
                  <tr key={s.id} style={{ background: s.active ? "var(--bg)" : "var(--bg-subtle)", opacity: s.active ? 1 : 0.5 }}>
                    <td style={{ ...cell, textAlign: "center" }}>
                      <input type="checkbox" checked={s.active}
                        onChange={e => updateSub(s.id, "active", e.target.checked)}
                        style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ ...cell, color: "var(--ink)" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{s.description}</span>
                        <span style={{ fontSize: "10px", color: "var(--ink-faint)" }}>{s.phase_code}</span>
                      </div>
                    </td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      <input type="number" min={0} step={1}
                        value={s.units || ""}
                        placeholder="0"
                        onChange={e => updateSub(s.id, "units", Number(e.target.value))}
                        style={inputStyle} />
                    </td>
                    <td style={{ ...calcCell }}>{s.unit_type}</td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      <input type="number" min={0} step={0.01}
                        value={s.unit_cost || ""}
                        onChange={e => updateSub(s.id, "unit_cost", Number(e.target.value))}
                        style={{ ...inputStyle, width: "72px" }} />
                    </td>
                    <td style={{ ...calcCell }}>{hasValue ? $(cs.raw) : "—"}</td>
                    <td style={{ ...numCell, fontWeight: 600, color: hasValue ? "var(--sage)" : "var(--ink-faint)" }}>
                      {hasValue ? $(cs.total) : "—"}
                    </td>
                    <td style={{ ...cell }}>
                      <input type="text"
                        value={s.notes}
                        placeholder="notes…"
                        onChange={e => updateSub(s.id, "notes", e.target.value)}
                        style={{ ...inputStyle, width: "140px", textAlign: "left" }} />
                    </td>
                  </tr>
                )
              })}
              {stTotal > 0 && (
                <tr style={{ background: "var(--bg-subtle)", borderTop: "2px solid var(--border)" }}>
                  <td colSpan={6} style={{ ...cell, textAlign: "right", fontWeight: 500, color: "var(--ink-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Subtrades Total
                  </td>
                  <td style={{ ...numCell, fontWeight: 700, color: "var(--ink)", fontSize: "13px" }}>{$(stTotal)}</td>
                  <td style={calcCell}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Summary Bar ── */}
      {(dfTotal > 0 || stTotal > 0) && (
        <div style={{ margin: "1rem 0", padding: "1rem 1.5rem", background: "var(--bg-subtle)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "10px", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>DeHyl Own Forces</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>{$(dfTotal)}</p>
          </div>
          <div style={{ color: "var(--ink-faint)", fontSize: "1.2rem", alignSelf: "center" }}>+</div>
          <div>
            <p style={{ fontSize: "10px", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>Subtrades ({cfg.subtrade_markup}% mkp)</p>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>{$(stTotal)}</p>
          </div>
          <div style={{ color: "var(--ink-faint)", fontSize: "1.2rem", alignSelf: "center" }}>=</div>
          <div>
            <p style={{ fontSize: "10px", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>Estimate Total</p>
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--terra)", letterSpacing: "-0.03em" }}>{$(gt)}</p>
          </div>
        </div>
      )}

      {/* ── Grand Total ── */}
      <div style={{ marginTop: "0.75rem", padding: "1.5rem", background: gt > 0 ? "var(--ink)" : "var(--bg-subtle)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", border: gt === 0 ? "1px solid var(--border)" : "none" }}>
        <div>
          <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: gt > 0 ? "rgba(255,255,255,0.55)" : "var(--ink-faint)", fontWeight: 500, marginBottom: "0.3rem" }}>
            Grand Total
          </p>
          <p style={{ fontSize: "2.5rem", fontWeight: 600, letterSpacing: "-0.04em", color: gt > 0 ? "#fff" : "var(--ink-faint)", lineHeight: 1 }}>
            {gt > 0 ? $(gt) : "No items yet"}
          </p>
          {gt > 0 && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "0.35rem" }}>
              Labour: {$(sections.flatMap(s => s.items).filter(i => i.active && i.units > 0).reduce((s, i) => s + calcItem(i, cfg).labour, 0))} ·
              Material: {$(sections.flatMap(s => s.items).filter(i => i.active && i.units > 0).reduce((s, i) => s + calcItem(i, cfg).materialCost, 0))} ·
              Subtrades: {$(stTotal)}
            </p>
          )}
        </div>
        {gt > 0 && (
          <button onClick={handleApply} disabled={applying} style={{ padding: "0.75rem 1.5rem", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "9px", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(4px)" }}>
            {applying ? "Applying…" : "Apply to Bid →"}
          </button>
        )}
      </div>
    </div>
  )
}

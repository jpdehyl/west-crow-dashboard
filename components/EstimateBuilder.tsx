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

export default function EstimateBuilder({ bidId, bidName, saved }: { bidId: string; bidName: string; saved: any }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
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

  const dfTotal = deHylForces(sections, cfg)
  const stTotal = subtradesTotal(subtrades, cfg.subtrade_markup)
  const gt      = dfTotal + stTotal

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
      await fetch(`/api/bids/${bidId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, sections, subtrades, meta, grand_total: gt }),
      })
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
        body: JSON.stringify({ config: cfg, sections, subtrades, meta: approved, grand_total: gt }),
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
        body: JSON.stringify({ bid_value: Math.round(gt) }),
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
          <button onClick={handleApply} disabled={applying || gt === 0} style={{ padding: "0.55rem 1.25rem", background: "var(--ink)", color: "var(--bg)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: applying || gt === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: applying || gt === 0 ? 0.6 : 1 }}>
            {applying ? "Applying…" : `Apply ${$(gt)} → Bid Value`}
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
        <div style={{ marginBottom: "1.25rem", padding: "0.85rem 1.25rem", background: "#f0faf4", border: "1px solid #3d8c5c", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#3d8c5c", fontSize: "1.1rem" }}>✓</span>
          <p style={{ fontSize: "13px", fontWeight: 500, color: "#3d8c5c" }}>
            Approved by JP{meta.approved_at ? ` · ${new Date(meta.approved_at).toLocaleDateString("en-CA")}` : ""} — Ready for BuilderTrend
          </p>
          <button
            onClick={() => setMeta(m => ({ ...m, status: "clark_draft" }))}
            style={{ marginLeft: "auto", fontSize: "12px", color: "#3d8c5c", background: "none", border: "1px solid #3d8c5c", borderRadius: "6px", padding: "0.3rem 0.75rem", cursor: "pointer", fontFamily: "inherit" }}>
            Reopen
          </button>
        </div>
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

"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DEFAULT_SECTIONS, DEFAULT_CONFIG, type Section, type EstimateConfig } from "@/lib/estimate-data"

// ── Calculation ─────────────────────────────────────────────────────────────

function calcItem(units: number, upd: number, cfg: EstimateConfig) {
  const manDays     = upd > 0 ? units / upd : 0
  const labour      = manDays * cfg.cost_per_man_day
  const materialCost= labour * (cfg.material_pct / 100)
  const totalCost   = labour + materialCost
  const overhead    = totalCost * (cfg.overhead_pct / 100)
  const profit      = totalCost * (cfg.profit_pct  / 100)
  const total       = totalCost + overhead + profit
  const rpu         = units > 0 ? total / units : 0
  return { manDays, labour, materialCost, totalCost, overhead, profit, total, rpu }
}

function grandTotal(sections: Section[], cfg: EstimateConfig) {
  return sections.flatMap(s => s.items)
    .filter(i => i.active && i.units > 0)
    .reduce((sum, i) => sum + calcItem(i.units, i.units_per_day, cfg).total, 0)
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
    // Merge saved data onto defaults (preserves new sections added in updates)
    return DEFAULT_SECTIONS.map(def => {
      const s = saved.sections.find((x: any) => x.id === def.id)
      if (!s) return def
      return {
        ...def,
        expanded: s.expanded ?? def.expanded,
        items: def.items.map(di => {
          const si = s.items?.find((x: any) => x.id === di.id)
          return si ? { ...di, units: Number(si.units) || 0, units_per_day: Number(si.units_per_day) || di.units_per_day, active: si.active !== false, notes: si.notes || "" } : di
        }),
      }
    })
  })

  const gt = grandTotal(sections, cfg)

  function updateItem(secId: string, itemId: string, field: string, value: any) {
    setSections(prev => prev.map(s =>
      s.id !== secId ? s : {
        ...s,
        items: s.items.map(i => i.id !== itemId ? i : { ...i, [field]: value })
      }
    ))
  }

  function toggleSection(secId: string) {
    setSections(prev => prev.map(s => s.id === secId ? { ...s, expanded: !s.expanded } : s))
  }

  function sectionTotal(sec: Section) {
    return sec.items.filter(i => i.active && i.units > 0)
      .reduce((sum, i) => sum + calcItem(i.units, i.units_per_day, cfg).total, 0)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/bids/${bidId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, sections, grand_total: gt }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

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
          Applied to all line items
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
                      const c = calcItem(item.units, item.units_per_day, cfg)
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
                              <span>{item.description}</span>
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

      {/* ── Grand Total ── */}
      <div style={{ marginTop: "1.5rem", padding: "1.5rem", background: gt > 0 ? "var(--ink)" : "var(--bg-subtle)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", border: gt === 0 ? "1px solid var(--border)" : "none" }}>
        <div>
          <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: gt > 0 ? "rgba(255,255,255,0.55)" : "var(--ink-faint)", fontWeight: 500, marginBottom: "0.3rem" }}>
            Grand Total (Incl. {cfg.overhead_pct}% OH + {cfg.profit_pct}% Profit)
          </p>
          <p style={{ fontSize: "2.5rem", fontWeight: 600, letterSpacing: "-0.04em", color: gt > 0 ? "#fff" : "var(--ink-faint)", lineHeight: 1 }}>
            {gt > 0 ? $(gt) : "No items yet"}
          </p>
          {gt > 0 && (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "0.35rem" }}>
              Labour: {$(sections.flatMap(s => s.items).filter(i => i.active && i.units > 0).reduce((s, i) => s + calcItem(i.units, i.units_per_day, cfg).labour, 0))} · 
              Material: {$(sections.flatMap(s => s.items).filter(i => i.active && i.units > 0).reduce((s, i) => s + calcItem(i.units, i.units_per_day, cfg).materialCost, 0))}
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

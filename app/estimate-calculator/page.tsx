"use client"

import { useEffect, useMemo, useState } from "react"

type Unit = "SF" | "LF" | "each" | "day" | "flat" | "job"

type Item = {
  id: string
  name: string
  unit: Unit
  price: number
}

type Category = {
  id: string
  label: string
  items: Item[]
}

const CATEGORIES: Category[] = [
  {
    id: "ceilings",
    label: "Ceilings",
    items: [
      { id: "tbar-removal", name: "T-bar ceiling removal", unit: "SF", price: 1.0 },
      { id: "gwb-ceiling", name: "GWB drywall ceiling", unit: "SF", price: 3.5 },
      { id: "bulkhead", name: "Bulkhead", unit: "LF", price: 10.0 },
      { id: "comp-drywall-ceiling", name: "Complicated drywall ceiling (>10ft)", unit: "SF", price: 5.0 },
    ],
  },
  {
    id: "walls",
    label: "Walls & Partitions",
    items: [
      { id: "std-partition", name: "Standard partition wall (both faces + studs, up to 9ft)", unit: "LF", price: 25.0 },
      { id: "qdeck-partition", name: "Partition wall (to Q-Deck, 9–14ft)", unit: "LF", price: 30.0 },
      { id: "single-sided-drywall-removal", name: "Single-sided drywall removal", unit: "LF", price: 15.0 },
      { id: "lath-plaster-wall", name: "Lath and plaster wall", unit: "LF", price: 30.0 },
    ],
  },
  {
    id: "flooring",
    label: "Flooring",
    items: [
      { id: "carpet", name: "Carpet tile or rolled carpet", unit: "SF", price: 1.0 },
      { id: "vct", name: "Vinyl tile (VCT)", unit: "SF", price: 2.5 },
      { id: "ceramic-porcelain", name: "Ceramic/porcelain tile", unit: "SF", price: 4.0 },
      { id: "engineered-wood", name: "Glued-down engineered wood", unit: "SF", price: 4.0 },
      { id: "laminate", name: "Laminate", unit: "SF", price: 2.0 },
    ],
  },
  {
    id: "doors",
    label: "Doors & Glazing",
    items: [
      { id: "single-door", name: "Single door + frame", unit: "each", price: 50.0 },
      { id: "double-door", name: "Double door + frame", unit: "each", price: 60.0 },
      { id: "std-storefront", name: "Standard storefront glazing", unit: "LF", price: 60.0 },
      { id: "comp-storefront", name: "Complicated storefront glazing", unit: "LF", price: 100.0 },
    ],
  },
  {
    id: "millwork",
    label: "Millwork & Fixtures",
    items: [
      { id: "millwork-cabinetry", name: "Millwork / cabinetry", unit: "LF", price: 25.0 },
      { id: "metal-shelving", name: "Metal shelving", unit: "LF", price: 15.0 },
      { id: "blinds", name: "Blinds removal", unit: "LF", price: 5.0 },
      { id: "lockers", name: "Lockers", unit: "each", price: 35.0 },
      { id: "office-washroom", name: "Office washroom (full)", unit: "SF", price: 20.0 },
    ],
  },
  {
    id: "hazmat",
    label: "Hazmat / Abatement",
    items: [
      { id: "lead-tile-abatement", name: "Lead tile abatement (floor)", unit: "SF", price: 4.0 },
      { id: "acm-drywall-removal", name: "ACM drywall removal", unit: "SF", price: 3.5 },
      { id: "hepa-negative-air", name: "HEPA vacuum / negative air (daily)", unit: "day", price: 55.0 },
      { id: "air-monitoring", name: "Air monitoring + clearance", unit: "each", price: 300.0 },
      { id: "abatement-bags", name: "Abatement disposal bags + supplies", unit: "job", price: 125.0 },
    ],
  },
  {
    id: "site",
    label: "Site Costs",
    items: [
      { id: "mobilization", name: "Mobilization (flat)", unit: "flat", price: 250.0 },
      { id: "bin-quarter", name: "Bin — quarter (small jobs <100SF)", unit: "each", price: 232.0 },
      { id: "bin-half", name: "Bin — half", unit: "each", price: 465.0 },
      { id: "bin-full", name: "Bin — full", unit: "each", price: 720.0 },
      { id: "live-out", name: "Live Out Allowance (per night)", unit: "day", price: 75.0 },
      { id: "concrete-cutting", name: "Concrete cutting / door opening", unit: "each", price: 1500.0 },
    ],
  },
]

const MARKUPS = [11, 15, 20, 25]

const currency = (v: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(v)

const qtyFormat = (v: number) => {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2).replace(/\.00$/, "")
}

export default function EstimateCalculatorPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const lines = useMemo(() => CATEGORIES.flatMap((c) => c.items.map((i) => ({ ...i, category: c.label }))), [])

  const activeLines = useMemo(() => {
    return lines
      .map((line) => {
        const qty = Number(quantities[line.id] || 0)
        return { ...line, qty, total: qty * line.price }
      })
      .filter((line) => line.qty > 0)
  }, [lines, quantities])

  const subtotal = activeLines.reduce((sum, line) => sum + line.total, 0)
  const supplies = subtotal * 0.05
  const totalCost = subtotal + supplies
  const bidByMarkup = MARKUPS.map((pct) => ({ pct, value: totalCost * (1 + pct / 100) }))
  const hasHazmat = activeLines.some((line) => line.category === "Hazmat / Abatement")
  const recommendedMarkup = totalCost < 3500 ? 15 : hasHazmat ? 25 : 20
  const crewDays = Math.ceil(totalCost / 500)

  const setQty = (id: string, value: string) => {
    const parsed = Number(value)
    setQuantities((prev) => ({ ...prev, [id]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 }))
  }

  const clearAll = () => {
    setQuantities({})
    setCopied(false)
  }

  const copySummary = async () => {
    const linesText = activeLines.map((l) => `- ${l.name}: ${qtyFormat(l.qty)} ${l.unit} × ${currency(l.price)} = ${currency(l.total)}`)
    const markupText = bidByMarkup.map((m) => `- ${m.pct}% markup: ${currency(m.value)}`)

    const payload = [
      "West Crow Contracting Estimate Summary",
      "",
      ...linesText,
      "",
      `Subtotal: ${currency(subtotal)}`,
      `Supplies/Tools (5%): ${currency(supplies)}`,
      `Total Cost: ${currency(totalCost)}`,
      `Crew-Days Estimate: ${crewDays}`,
      "",
      "Bid Price Options:",
      ...markupText,
      `Recommended Markup: ${recommendedMarkup}%`,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div style={{ background: "#fffdf8", borderRadius: "12px", padding: "0.25rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7f7566", fontWeight: 600, marginBottom: "0.45rem" }}>
          West Crow Contracting · Real-Time Pricing
        </p>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 500, color: "#1a1a1a", letterSpacing: "-0.03em" }}>Estimate Calculator</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: "1rem", alignItems: "start" }}>
        <section style={{ background: "#f7f2e9", border: "1px solid #e8dfd1", borderRadius: "12px", padding: "1rem" }}>
          {CATEGORIES.map((category) => (
            <div key={category.id} style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.65rem" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#8c7a65", fontWeight: 700 }}>{category.label}</span>
                <div style={{ height: "1px", flex: 1, background: "#dfd4c3" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {category.items.map((item) => {
                  const qty = quantities[item.id] || 0
                  const lineTotal = qty * item.price
                  const isActive = qty > 0

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) 140px 90px 130px",
                        gap: "0.55rem",
                        alignItems: "center",
                        padding: "0.5rem 0.65rem",
                        border: "1px solid #eadfcd",
                        borderRadius: "8px",
                        background: "#fffdf8",
                        opacity: isActive ? 1 : 0.7,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: "11px", color: "#8f877a" }}>{currency(item.price)} / {item.unit}</div>
                      </div>

                      {!isMobile && <div style={{ fontSize: "12px", color: "#6e665a" }}>Qty ({item.unit})</div>}

                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={qty === 0 ? "" : qty}
                        onChange={(e) => setQty(item.id, e.target.value)}
                        placeholder="0"
                        style={{
                          width: "100%",
                          border: "1px solid #d9ccba",
                          borderRadius: "6px",
                          padding: "0.45rem 0.5rem",
                          fontSize: "13px",
                          fontFamily: "inherit",
                          background: "#ffffff",
                          color: "#1a1a1a",
                        }}
                      />

                      <div style={{ textAlign: isMobile ? "left" : "right", fontSize: "13px", color: isActive ? "#1a1a1a" : "#948a7d", fontFamily: "DM Serif Display, var(--font-serif), serif" }}>
                        {currency(lineTotal)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        <aside
          style={{
            position: isMobile ? "static" : "sticky",
            top: "1rem",
            background: "#fffdf8",
            border: "1px solid #eadfcd",
            borderRadius: "12px",
            padding: "1rem",
          }}
        >
          <h2 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#7f7566", fontWeight: 700, marginBottom: "0.6rem" }}>
            Live Summary
          </h2>

          <div style={{ maxHeight: "240px", overflowY: "auto", marginBottom: "0.85rem", paddingRight: "0.15rem" }}>
            {activeLines.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#908674" }}>Enter quantities to build your estimate.</p>
            ) : (
              activeLines.map((line) => (
                <div key={line.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", marginBottom: "0.45rem" }}>
                  <div style={{ fontSize: "12px", color: "#1f1f1f" }}>
                    {line.name}
                    <span style={{ color: "#8b7f70" }}> · {qtyFormat(line.qty)} {line.unit}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#1f1f1f", fontFamily: "DM Serif Display, var(--font-serif), serif" }}>{currency(line.total)}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ borderTop: "1px solid #e4d8c6", paddingTop: "0.8rem", display: "flex", flexDirection: "column", gap: "0.38rem" }}>
            <Row label="Subtotal" value={currency(subtotal)} />
            <Row label="Supplies/Tools (5%)" value={`+ ${currency(supplies)}`} />
            <Row label="Total Cost" value={currency(totalCost)} bold />

            <div style={{ height: "1px", background: "#e4d8c6", margin: "0.35rem 0" }} />

            {bidByMarkup.map((row) => {
              const isRecommended = row.pct === recommendedMarkup
              return (
                <div
                  key={row.pct}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "13px",
                    padding: "0.35rem 0.45rem",
                    borderRadius: "6px",
                    background: isRecommended ? "#f4e4d8" : "transparent",
                    border: isRecommended ? "1px solid #c4714a" : "1px solid transparent",
                  }}
                >
                  <span style={{ color: isRecommended ? "#9a4f30" : "#5f5649", fontWeight: isRecommended ? 600 : 500 }}>
                    {row.pct}% markup {isRecommended ? "(recommended)" : ""}
                  </span>
                  <span style={{ color: "#1a1a1a", fontFamily: "DM Serif Display, var(--font-serif), serif" }}>{currency(row.value)}</span>
                </div>
              )
            })}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem", fontSize: "12px", color: "#665d51" }}>
              <span>Crew-days estimate</span>
              <span style={{ fontFamily: "DM Serif Display, var(--font-serif), serif", color: "#1a1a1a", fontSize: "1rem" }}>{crewDays}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.55rem", marginTop: "0.95rem" }}>
            <button
              type="button"
              onClick={clearAll}
              style={{
                flex: 1,
                background: "#f1e7d8",
                border: "1px solid #decfb9",
                borderRadius: "7px",
                padding: "0.55rem",
                fontSize: "12px",
                fontWeight: 600,
                color: "#5f5649",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={copySummary}
              style={{
                flex: 1,
                background: "#c4714a",
                border: "1px solid #b5643d",
                borderRadius: "7px",
                padding: "0.55rem",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {copied ? "Copied ✓" : "Copy Summary"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
      <span style={{ color: "#5f5649", fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ color: "#1a1a1a", fontFamily: "DM Serif Display, var(--font-serif), serif", fontSize: bold ? "1.05rem" : "0.95rem" }}>{value}</span>
    </div>
  )
}

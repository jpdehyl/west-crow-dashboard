"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DEFAULT_CONFIG, DEFAULT_SECTIONS, DEFAULT_SUBTRADES, type Section, type SubtradeItem } from "@/lib/estimate-data"

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

type BidOption = { pct: number; value: number }

const CATEGORIES: Category[] = [
  { id: "ceilings", label: "Ceilings", items: [
    { id: "tbar-removal", name: "T-bar ceiling removal", unit: "SF", price: 1.0 },
    { id: "gwb-ceiling", name: "GWB drywall ceiling", unit: "SF", price: 3.5 },
    { id: "bulkhead", name: "Bulkhead", unit: "LF", price: 10.0 },
    { id: "comp-drywall-ceiling", name: "Complicated drywall ceiling (>10ft)", unit: "SF", price: 5.0 },
  ]},
  { id: "walls", label: "Walls & Partitions", items: [
    { id: "std-partition", name: "Standard partition wall (both faces + studs, up to 9ft)", unit: "LF", price: 25.0 },
    { id: "qdeck-partition", name: "Partition wall (to Q-Deck, 9–14ft)", unit: "LF", price: 30.0 },
    { id: "single-sided-drywall-removal", name: "Single-sided drywall removal", unit: "LF", price: 15.0 },
    { id: "lath-plaster-wall", name: "Lath and plaster wall", unit: "LF", price: 30.0 },
  ]},
  { id: "flooring", label: "Flooring", items: [
    { id: "carpet", name: "Carpet tile or rolled carpet", unit: "SF", price: 1.0 },
    { id: "vct", name: "Vinyl tile (VCT)", unit: "SF", price: 2.5 },
    { id: "ceramic-porcelain", name: "Ceramic/porcelain tile", unit: "SF", price: 4.0 },
    { id: "engineered-wood", name: "Glued-down engineered wood", unit: "SF", price: 4.0 },
    { id: "laminate", name: "Laminate", unit: "SF", price: 2.0 },
  ]},
  { id: "doors", label: "Doors & Glazing", items: [
    { id: "single-door", name: "Single door + frame", unit: "each", price: 50.0 },
    { id: "double-door", name: "Double door + frame", unit: "each", price: 60.0 },
    { id: "std-storefront", name: "Standard storefront glazing", unit: "LF", price: 60.0 },
    { id: "comp-storefront", name: "Complicated storefront glazing", unit: "LF", price: 100.0 },
  ]},
  { id: "millwork", label: "Millwork & Fixtures", items: [
    { id: "millwork-cabinetry", name: "Millwork / cabinetry", unit: "LF", price: 25.0 },
    { id: "metal-shelving", name: "Metal shelving", unit: "LF", price: 15.0 },
    { id: "blinds", name: "Blinds removal", unit: "LF", price: 5.0 },
    { id: "lockers", name: "Lockers", unit: "each", price: 35.0 },
    { id: "office-washroom", name: "Office washroom (full)", unit: "SF", price: 20.0 },
  ]},
  { id: "hazmat", label: "Hazmat / Abatement", items: [
    { id: "lead-tile-abatement", name: "Lead tile abatement (floor)", unit: "SF", price: 4.0 },
    { id: "acm-drywall-removal", name: "ACM drywall removal", unit: "SF", price: 3.5 },
    { id: "hepa-negative-air", name: "HEPA vacuum / negative air (daily)", unit: "day", price: 55.0 },
    { id: "air-monitoring", name: "Air monitoring + clearance", unit: "each", price: 300.0 },
    { id: "abatement-bags", name: "Abatement disposal bags + supplies", unit: "job", price: 125.0 },
  ]},
  { id: "site", label: "Site Costs", items: [
    { id: "mobilization", name: "Mobilization (flat)", unit: "flat", price: 250.0 },
    { id: "bin-quarter", name: "Bin — quarter (small jobs <100SF)", unit: "each", price: 232.0 },
    { id: "bin-half", name: "Bin — half", unit: "each", price: 465.0 },
    { id: "bin-full", name: "Bin — full", unit: "each", price: 720.0 },
    { id: "live-out", name: "Live Out Allowance (per night)", unit: "day", price: 75.0 },
    { id: "concrete-cutting", name: "Concrete cutting / door opening", unit: "each", price: 1500.0 },
  ]},
]

const MARKUPS = [11, 15, 20, 25]

const currency = (v: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(v)
const qtyFormat = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.00$/, ""))

function cloneSections() {
  return DEFAULT_SECTIONS.map((s) => ({ ...s, items: s.items.map((i) => ({ ...i, units: 0, notes: "" })) }))
}

function cloneSubtrades() {
  return DEFAULT_SUBTRADES.map((s) => ({ ...s, units: 0, notes: "" }))
}

function buildSeededEstimate(activeLines: Array<Item & { qty: number; total: number; category: string }>, totalCost: number, bidOptions: BidOption[], recommendedMarkup: number) {
  const sections: Section[] = cloneSections()
  const subtrades: SubtradeItem[] = cloneSubtrades()

  const addUnits = (sectionId: string, itemId: string, qty: number) => {
    const section = sections.find((s) => s.id === sectionId)
    const item = section?.items.find((i) => i.id === itemId)
    if (item) item.units += qty
  }
  const addSub = (id: string, units: number) => {
    const sub = subtrades.find((s) => s.id === id)
    if (sub) sub.units += units
  }

  for (const line of activeLines) {
    switch (line.id) {
      case "tbar-removal":
      case "gwb-ceiling":
      case "comp-drywall-ceiling":
        addUnits("demo_structural", "demo-ceil", line.qty)
        break
      case "bulkhead":
      case "std-partition":
      case "qdeck-partition":
      case "single-sided-drywall-removal":
      case "lath-plaster-wall":
      case "std-storefront":
      case "comp-storefront":
        addUnits("demo_structural", "demo-walls", line.qty)
        break
      case "carpet":
      case "vct":
      case "ceramic-porcelain":
      case "engineered-wood":
      case "laminate":
        addUnits("flooring", "floor-rem", line.qty)
        break
      case "single-door":
      case "double-door":
      case "lockers":
        addUnits("demo_structural", "demo-fixts", line.qty)
        break
      case "millwork-cabinetry":
      case "metal-shelving":
      case "blinds":
        addUnits("demo_structural", "demo-millw", line.qty)
        break
      case "office-washroom":
        addUnits("washroom", "wash-wall", line.qty)
        addUnits("washroom", "wash-tile", line.qty * 0.4)
        break
      case "lead-tile-abatement":
        addUnits("lead", "lead-rem", line.qty)
        break
      case "acm-drywall-removal":
        addUnits("acm_drywall", "dry-rem", line.qty)
        break
      case "air-monitoring":
        addSub("sub-air", line.qty)
        break
      case "abatement-bags":
        addSub("sub-haul", line.qty)
        break
      case "live-out":
        addSub("sub-loa", line.qty)
        break
      case "bin-quarter":
      case "bin-half":
      case "bin-full":
        addSub("sub-disposal", line.total / 2800)
        break
      case "concrete-cutting":
        addUnits("others", "oth-safe", line.qty)
        break
      default:
        break
    }
  }

  if (activeLines.some((l) => l.id === "mobilization")) {
    addUnits("demo_structural", "demo-mob", 1)
    addUnits("flooring", "floor-mob", 1)
  }

  const assumptions = activeLines.map((l) => ({
    id: `quick-${l.id}`,
    severity: "info" as const,
    source: "Quick Estimate Calculator",
    text: `${l.name}: ${qtyFormat(l.qty)} ${l.unit} @ ${currency(l.price)} = ${currency(l.total)}`,
    resolved: true,
  }))

  return {
    config: DEFAULT_CONFIG,
    sections,
    subtrades,
    meta: {
      status: "clark_draft",
      clark_notes: `Seeded from Quick Estimate Calculator. Total cost ${currency(totalCost)}. Recommended markup ${recommendedMarkup}%.`,
      prepared_by: "OpenClaw Quick Calculator",
      prepared_at: new Date().toISOString(),
      assumptions,
    },
    grand_total: Math.round(totalCost),
    quick_takeoff: {
      items: activeLines,
      total_cost: totalCost,
      bid_options: bidOptions,
      recommended_markup: recommendedMarkup,
      seeded_at: new Date().toISOString(),
    },
  }
}

export default function EstimateCalculatorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [bids, setBids] = useState<Array<{ id: string; project_name: string; client: string }>>([])
  const [selectedBidId, setSelectedBidId] = useState("")
  const [sending, setSending] = useState(false)
  const [handoffMsg, setHandoffMsg] = useState("")

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    const fromQuery = searchParams.get("bidId")
    if (fromQuery) setSelectedBidId(fromQuery)
  }, [searchParams])

  useEffect(() => {
    fetch("/api/bids")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setBids(data.map((b: any) => ({ id: String(b.id), project_name: b.project_name || "Unnamed", client: b.client || "" })))
      })
      .catch(() => setBids([]))
  }, [])

  const lines = useMemo(() => CATEGORIES.flatMap((c) => c.items.map((i) => ({ ...i, category: c.label }))), [])
  const activeLines = useMemo(
    () => lines.map((line) => ({ ...line, qty: Number(quantities[line.id] || 0), total: Number(quantities[line.id] || 0) * line.price })).filter((line) => line.qty > 0),
    [lines, quantities],
  )

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
    setHandoffMsg("")
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

  const sendToBidEstimate = async () => {
    if (!selectedBidId || activeLines.length === 0) return
    setSending(true)
    setHandoffMsg("")
    try {
      const payload = buildSeededEstimate(activeLines, totalCost, bidByMarkup, recommendedMarkup)
      const res = await fetch(`/api/bids/${selectedBidId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to seed estimate")
      setHandoffMsg("Estimate seeded. Opening full estimator…")
      router.push(`/bids/${selectedBidId}/estimate`)
    } catch {
      setHandoffMsg("Could not send to estimator. Try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ background: "#fffdf8", borderRadius: "12px", padding: "0.25rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7f7566", fontWeight: 600, marginBottom: "0.45rem" }}>West Crow Contracting · Real-Time Pricing</p>
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
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) 140px 90px 130px", gap: "0.55rem", alignItems: "center", padding: "0.5rem 0.65rem", border: "1px solid #eadfcd", borderRadius: "8px", background: "#fffdf8", opacity: isActive ? 1 : 0.7 }}>
                      <div>
                        <div style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: "11px", color: "#8f877a" }}>{currency(item.price)} / {item.unit}</div>
                      </div>
                      {!isMobile && <div style={{ fontSize: "12px", color: "#6e665a" }}>Qty ({item.unit})</div>}
                      <input type="number" min={0} step="any" value={qty === 0 ? "" : qty} onChange={(e) => setQty(item.id, e.target.value)} placeholder="0" style={{ width: "100%", border: "1px solid #d9ccba", borderRadius: "6px", padding: "0.45rem 0.5rem", fontSize: "13px", fontFamily: "inherit", background: "#ffffff", color: "#1a1a1a" }} />
                      <div style={{ textAlign: isMobile ? "left" : "right", fontSize: "13px", color: isActive ? "#1a1a1a" : "#948a7d", fontFamily: "DM Serif Display, var(--font-serif), serif" }}>{currency(lineTotal)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </section>

        <aside style={{ position: isMobile ? "static" : "sticky", top: "1rem", background: "#fffdf8", border: "1px solid #eadfcd", borderRadius: "12px", padding: "1rem" }}>
          <h2 style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#7f7566", fontWeight: 700, marginBottom: "0.6rem" }}>Live Summary</h2>

          <div style={{ maxHeight: "240px", overflowY: "auto", marginBottom: "0.85rem", paddingRight: "0.15rem" }}>
            {activeLines.length === 0 ? <p style={{ fontSize: "12px", color: "#908674" }}>Enter quantities to build your estimate.</p> : activeLines.map((line) => (
              <div key={line.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", marginBottom: "0.45rem" }}>
                <div style={{ fontSize: "12px", color: "#1f1f1f" }}>{line.name}<span style={{ color: "#8b7f70" }}> · {qtyFormat(line.qty)} {line.unit}</span></div>
                <div style={{ fontSize: "12px", color: "#1f1f1f", fontFamily: "DM Serif Display, var(--font-serif), serif" }}>{currency(line.total)}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #e4d8c6", paddingTop: "0.8rem", display: "flex", flexDirection: "column", gap: "0.38rem" }}>
            <Row label="Subtotal" value={currency(subtotal)} />
            <Row label="Supplies/Tools (5%)" value={`+ ${currency(supplies)}`} />
            <Row label="Total Cost" value={currency(totalCost)} bold />
            <div style={{ height: "1px", background: "#e4d8c6", margin: "0.35rem 0" }} />
            {bidByMarkup.map((row) => {
              const isRecommended = row.pct === recommendedMarkup
              return (
                <div key={row.pct} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", padding: "0.35rem 0.45rem", borderRadius: "6px", background: isRecommended ? "#f4e4d8" : "transparent", border: isRecommended ? "1px solid #c4714a" : "1px solid transparent" }}>
                  <span style={{ color: isRecommended ? "#9a4f30" : "#5f5649", fontWeight: isRecommended ? 600 : 500 }}>{row.pct}% markup {isRecommended ? "(recommended)" : ""}</span>
                  <span style={{ color: "#1a1a1a", fontFamily: "DM Serif Display, var(--font-serif), serif" }}>{currency(row.value)}</span>
                </div>
              )
            })}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem", fontSize: "12px", color: "#665d51" }}>
              <span>Crew-days estimate</span>
              <span style={{ fontFamily: "DM Serif Display, var(--font-serif), serif", color: "#1a1a1a", fontSize: "1rem" }}>{crewDays}</span>
            </div>
          </div>

          <div style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px dashed #dbcdb8" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#7f7566", marginBottom: "0.35rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Send to Bid / Estimate</label>
            <select value={selectedBidId} onChange={(e) => setSelectedBidId(e.target.value)} style={{ width: "100%", border: "1px solid #d9ccba", borderRadius: "7px", padding: "0.5rem", fontSize: "12px", fontFamily: "inherit", background: "#fff" }}>
              <option value="">Select a bid…</option>
              {bids.map((bid) => <option key={bid.id} value={bid.id}>{bid.project_name} {bid.client ? `· ${bid.client}` : ""}</option>)}
            </select>
            <button type="button" onClick={sendToBidEstimate} disabled={!selectedBidId || activeLines.length === 0 || sending} style={{ width: "100%", marginTop: "0.45rem", background: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: "7px", padding: "0.55rem", fontSize: "12px", fontWeight: 600, color: "#ffffff", cursor: !selectedBidId || activeLines.length === 0 || sending ? "not-allowed" : "pointer", opacity: !selectedBidId || activeLines.length === 0 || sending ? 0.55 : 1, fontFamily: "inherit" }}>
              {sending ? "Sending…" : "Send to Bid/Estimate"}
            </button>
            {handoffMsg && <p style={{ marginTop: "0.4rem", fontSize: "11px", color: handoffMsg.includes("Could not") ? "#9c4b2b" : "#5a7a5a" }}>{handoffMsg}</p>}
          </div>

          <div style={{ display: "flex", gap: "0.55rem", marginTop: "0.95rem" }}>
            <button type="button" onClick={clearAll} style={{ flex: 1, background: "#f1e7d8", border: "1px solid #decfb9", borderRadius: "7px", padding: "0.55rem", fontSize: "12px", fontWeight: 600, color: "#5f5649", cursor: "pointer", fontFamily: "inherit" }}>Clear All</button>
            <button type="button" onClick={copySummary} style={{ flex: 1, background: "#c4714a", border: "1px solid #b5643d", borderRadius: "7px", padding: "0.55rem", fontSize: "12px", fontWeight: 600, color: "#ffffff", cursor: "pointer", fontFamily: "inherit" }}>{copied ? "Copied ✓" : "Copy Summary"}</button>
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

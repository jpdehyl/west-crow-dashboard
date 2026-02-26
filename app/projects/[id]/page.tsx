import { getProject, getBids, getClients } from "@/lib/sheets"
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils"
import LogForm from "@/components/LogForm"
import CostForm from "@/components/CostForm"
import InvoiceActions from "@/components/InvoiceActions"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

const WEATHER_ICON: Record<string, string> = {
  Clear: "☀", Overcast: "☁", Rain: "🌧", Snow: "❄", Fog: "🌫",
}
const COST_COLOR: Record<string, string> = {
  labour: "#4a6fa8", materials: "#c4963a", equipment: "#7a5a8a",
  subcontractor: "#5a7a5a", other: "#b5afa5",
}

function SectionMarker({ n, title, date }: { n: string; title: string; date?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "3rem 0 1.75rem" }}>
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--terra)", fontFamily: "var(--font-sans), sans-serif", flexShrink: 0 }}>{n}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-muted)", flexShrink: 0 }}>{title}</span>
      {date && (<><div style={{ width: "1px", height: "12px", background: "var(--border)" }} /><span style={{ fontSize: "11px", color: "var(--ink-faint)", flexShrink: 0 }}>{date}</span></>)}
    </div>
  )
}

function StoryCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent || "var(--terra)"}`, borderRadius: "0 10px 10px 0", padding: "1.25rem 1.5rem" }}>
      {children}
    </div>
  )
}

function KVRow({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: "12px", color: "var(--ink-faint)", fontWeight: 500, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", fontFamily: mono ? "var(--font-serif), serif" : "inherit", letterSpacing: mono ? "-0.02em" : "inherit" }}>{value}</span>
      {sub && <span style={{ fontSize: "11px", color: "var(--ink-faint)", marginLeft: "0.5rem" }}>{sub}</span>}
    </div>
  )
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, allBids, clients] = await Promise.all([getProject(params.id), getBids(), getClients()])
  if (!project) notFound()

  const bid    = (allBids as any[]).find((b: any) => b.id === project.bid_id)
  const client = (clients as any[]).find((c: any) => c.id === project.client_id)

  // ── Financials ─────────────────────────────────────────────────────────
  const totalCosts   = (project.costs as any[]).reduce((s: number, c: any) => s + c.amount, 0)
  const budgetTotal  = project.budget_labour + project.budget_materials + project.budget_equipment + project.budget_subs
  const budgetPct    = Math.round(totalCosts / budgetTotal * 100)
  const marginCurrent = Math.round((project.contract_value - totalCosts) / project.contract_value * 100)

  const costByCat = (project.costs as any[]).reduce((acc: Record<string, number>, c: any) => {
    acc[c.category] = (acc[c.category] || 0) + c.amount; return acc
  }, {})

  const budgetByCat: Record<string, number> = {
    labour: project.budget_labour, materials: project.budget_materials,
    equipment: project.budget_equipment, subcontractor: project.budget_subs,
  }

  // ── Timeline ────────────────────────────────────────────────────────────
  const bidInvited   = bid?.timeline?.find((e: any) => e.stage === 'invited')
  const bidEstimated = bid?.timeline?.find((e: any) => e.stage === 'estimating')
  const bidSubmitted = bid?.timeline?.find((e: any) => e.stage === 'submitted')
  const bidWon       = bid?.timeline?.find((e: any) => e.stage === 'decision')
  const invoiceSent  = (project.invoices as any[])?.find((i: any) => i.sent_date)
  const invoicePaid  = (project.invoices as any[])?.find((i: any) => i.paid_date)

  const LIFECYCLE = [
    { key: 'invited',   label: 'Invited',   date: bidInvited?.date,       done: !!bidInvited },
    { key: 'estimated', label: 'Estimated', date: bidEstimated?.date,     done: !!bidEstimated },
    { key: 'won',       label: 'Awarded',   date: bidWon?.date,           done: !!bidWon },
    { key: 'active',    label: 'On Site',   date: project.start_date,     done: true },
    { key: 'invoiced',  label: 'Invoiced',  date: invoiceSent?.sent_date, done: !!invoiceSent },
    { key: 'paid',      label: 'Paid',      date: invoicePaid?.paid_date, done: !!invoicePaid },
    { key: 'closed',    label: 'Closed',    date: project.status === 'complete' ? project.end_date : undefined, done: project.status === 'complete' },
  ]
  const currentStageIdx = LIFECYCLE.reduce((last: number, s: any, i: number) => s.done ? i : last, 0)

  // ── Days on site ────────────────────────────────────────────────────────
  const today   = new Date(); today.setHours(0,0,0,0)
  const startD  = new Date(project.start_date); startD.setHours(0,0,0,0)
  const endD    = new Date(project.end_date); endD.setHours(0,0,0,0)
  const totalDays   = Math.ceil((endD.getTime() - startD.getTime()) / 86400000)
  const elapsedRaw  = Math.ceil((today.getTime() - startD.getTime()) / 86400000)
  const elapsedDays = Math.max(0, Math.min(elapsedRaw, totalDays))
  const daysLeft    = Math.max(0, Math.ceil((endD.getTime() - today.getTime()) / 86400000))
  const timePct     = Math.round(elapsedDays / totalDays * 100)
  const notStarted  = today < startD

  // ── Invoice summary ─────────────────────────────────────────────────────
  const totalInvoiced = (project.invoices as any[])?.reduce((s: number, i: any) => s + i.gross_amount, 0) || 0
  const totalPaid     = (project.invoices as any[])?.filter((i: any) => i.paid_date).reduce((s: number, i: any) => s + i.gross_amount, 0) || 0

  return (
    <div style={{ maxWidth: "820px" }}>
      <Link href="/projects" style={{ fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.75rem" }}>
        ← Projects
      </Link>

      {/* HEADER */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>
              {project.client} · {project.estimator}{project.superintendent && ` · Oscar (super)`}
            </p>
            <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", lineHeight: 1.1, marginBottom: "0.5rem" }}>
              {project.project_name}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
              {project.po_number && (
                <span style={{ fontSize: "12px", color: "var(--ink-faint)", background: "var(--bg-subtle)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "5px" }}>
                  PO {project.po_number}
                </span>
              )}
              <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>
              {notStarted ? (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--gold)", background: "var(--gold-light)", padding: "2px 9px", borderRadius: "5px" }}>
                  Mobilizing {formatDateShort(project.start_date)}
                </span>
              ) : (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--sage)", background: "var(--sage-light)", padding: "2px 9px", borderRadius: "5px" }}>● Active</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "2rem", fontWeight: 400, letterSpacing: "-0.04em", color: "var(--ink)" }}>{formatCurrency(project.contract_value)}</p>
            <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.2rem" }}>contract value</p>
          </div>
        </div>
      </div>

      {/* LIFECYCLE TIMELINE */}
      <div style={{ padding: "1.5rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {LIFECYCLE.map((stage, i) => {
            const isActive = i === currentStageIdx
            const isDone   = stage.done
            const isLast   = i === LIFECYCLE.length - 1
            return (
              <div key={stage.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {!isLast && (
                  <div style={{ position: "absolute", top: "9px", left: "50%", width: "100%", height: "2px", background: i < currentStageIdx ? "var(--terra)" : "var(--border)", zIndex: 0 }} />
                )}
                <div style={{ width: 18, height: 18, borderRadius: "50%", zIndex: 1, flexShrink: 0, background: isDone ? "var(--terra)" : "var(--border)", border: isActive ? "3px solid var(--terra)" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isDone && !isActive && <span style={{ color: "white", fontSize: "8px", fontWeight: 700 }}>✓</span>}
                  {isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--terra)", display: "block" }} />}
                </div>
                <p style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "0.4rem", color: isDone ? "var(--ink)" : "var(--ink-faint)", textAlign: "center" }}>{stage.label}</p>
                <p style={{ fontSize: "10px", color: isDone ? "var(--terra)" : "var(--ink-faint)", marginTop: "0.1rem", textAlign: "center" }}>
                  {stage.date ? formatDateShort(stage.date) : "—"}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", marginTop: "1rem", marginBottom: "0.5rem" }}>
        {[
          { label: "Contract",     value: formatCurrency(project.contract_value), sub: "agreed value",           warn: false },
          { label: "Spent So Far", value: formatCurrency(totalCosts),             sub: `${budgetPct}% of budget`, warn: budgetPct > 85 },
          { label: "Margin Track", value: `${marginCurrent}%`,                   sub: notStarted ? "estimated" : "if stopped now", warn: marginCurrent < 20 },
          notStarted
            ? { label: "Starts In", value: `${Math.abs(daysLeft)}d`, sub: formatDate(project.start_date), warn: false }
            : { label: "Days Left", value: String(daysLeft), sub: `day ${elapsedDays} of ${totalDays}`, warn: daysLeft < 5 },
        ].map(({ label, value, sub, warn }) => (
          <div key={label} style={{ background: "var(--bg)", padding: "1.25rem 1.5rem" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.4rem" }}>{label}</p>
            <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.6rem", color: warn ? "var(--terra)" : "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: "11px", color: warn ? "var(--terra)" : "var(--ink-faint)", marginTop: "0.3rem" }}>{sub}</p>
          </div>
        ))}
      </div>

      {!notStarted && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${timePct}%`, background: "var(--gold)", borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "0.35rem", textAlign: "right" }}>{timePct}% of timeline elapsed</p>
        </div>
      )}

      {/* 01 ORIGIN */}
      <SectionMarker n="01" title="Origin" date={bidInvited ? formatDateShort(bidInvited.date) : undefined} />
      {bid && bidInvited && (
        <>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
            This project started when <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{project.client}</strong>
            {client ? ` (${client.contact_name})` : ""} sent a bid invitation on{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{formatDate(bidInvited.date)}</strong>.{" "}
            {bidInvited.by === 'Ean' ? `The invite was received and logged by Ean.` : `Received by ${bidInvited.by}.`}
          </p>
          <StoryCard>
            <KVRow label="Received by"    value={bidInvited.by || "Ean"} />
            <KVRow label="Client contact" value={client?.contact_name || project.client} />
            <KVRow label="Contact email"  value={client?.email || "—"} />
            <KVRow label="Contact phone"  value={client?.phone || "—"} />
            {bidInvited.note && <KVRow label="Notes" value={bidInvited.note} />}
          </StoryCard>
        </>
      )}

      {/* 02 ESTIMATE */}
      <SectionMarker n="02" title="Estimate" date={bidEstimated ? formatDateShort(bidEstimated.date) : undefined} />
      {bid && bidEstimated && (
        <>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{bid.estimator}</strong> completed the takeoff on{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{formatDate(bidEstimated.date)}</strong>.
            {bidEstimated.note ? ` ${bidEstimated.note}.` : ""}
          </p>
          <StoryCard>
            <KVRow label="Estimator"   value={bid.estimator} />
            <KVRow label="Bid value"   value={formatCurrency(bid.bid_value)} mono />
            <KVRow label="Scope"       value={bid.notes || "—"} />
            {bidEstimated.by && <KVRow label="Prepared by" value={bidEstimated.by} />}
          </StoryCard>
        </>
      )}

      {/* 03 AWARD */}
      <SectionMarker n="03" title="Award / PO" date={bidWon ? formatDateShort(bidWon.date) : undefined} />
      {bid && bidWon && (
        <>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
            West Crow was awarded the contract on{" "}
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{formatDate(bidWon.date)}</strong>.{" "}
            {bidWon.note ? bidWon.note + "." : ""}
            {bid.margin_pct ? ` Estimated margin at ${bid.margin_pct}%.` : ""}
          </p>
          <StoryCard accent="var(--sage)">
            <KVRow label="PO number"        value={project.po_number || "—"} />
            <KVRow label="Contract signed"  value={project.contract_signed_date ? formatDate(project.contract_signed_date) : "—"} />
            <KVRow label="Contract value"   value={formatCurrency(project.contract_value)} mono />
            <KVRow label="Estimated margin" value={bid.margin_pct ? `${bid.margin_pct}%` : "—"} />
            <KVRow label="Issued by"        value={client?.contact_name || project.client} />
          </StoryCard>
        </>
      )}

      {/* 04 FIELD EXECUTION */}
      <SectionMarker n="04" title="Field Execution" date={project.start_date ? formatDateShort(project.start_date) : undefined} />

      {!notStarted && (
        <div style={{ marginBottom: "1.25rem" }}>
          <LogForm projectId={project.id} />
        </div>
      )}

      {notStarted ? (
        <div style={{ padding: "2rem", background: "var(--gold-light)", border: "1px solid var(--border)", borderRadius: "10px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)" }}>
            Mobilization begins <strong style={{ color: "var(--ink)" }}>{formatDate(project.start_date)}</strong>. Daily logs will appear here once work is underway.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.75, marginBottom: "1.25rem" }}>
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{project.superintendent || project.estimator}</strong>{" "}
            mobilized on <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{formatDate(project.start_date)}</strong>.{" "}
            {(project.daily_logs as any[]).length} day{(project.daily_logs as any[]).length !== 1 ? "s" : ""} logged · {(project.daily_logs as any[]).reduce((s: number, d: any) => s + d.hours, 0)} total hours.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(project.daily_logs as any[]).map((log: any, i: number) => {
              const startDate = new Date(project.start_date); startDate.setHours(0,0,0,0)
              const logDate   = new Date(log.date); logDate.setHours(0,0,0,0)
              const dayNum    = Math.ceil((logDate.getTime() - startDate.getTime()) / 86400000) + 1
              const wxIcon    = WEATHER_ICON[log.weather] || ""
              return (
                <div key={log.id || i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderLeft: log.issues ? "3px solid var(--terra)" : "3px solid var(--border)", borderRadius: "0 10px 10px 0", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.25rem", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontFamily: "var(--font-serif), serif", fontSize: "1rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatDateShort(log.date)}</span>
                      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Day {dayNum}</span>
                      {wxIcon && <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{wxIcon} {log.weather}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{log.hours} hrs</span>
                      {log.photos && <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>📷 {log.photos}</span>}
                    </div>
                  </div>
                  <div style={{ padding: "1rem 1.25rem" }}>
                    <p style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.7, marginBottom: "0.6rem" }}>{log.work_performed}</p>
                    <p style={{ fontSize: "12px", color: "var(--ink-faint)" }}>{Array.isArray(log.crew) ? log.crew.join(" · ") : log.crew}</p>
                    {log.issues && (
                      <div style={{ marginTop: "0.85rem", padding: "0.7rem 0.85rem", background: "var(--terra-light)", borderRadius: "6px", border: "1px solid rgba(196,113,74,0.2)" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terra)", marginBottom: "0.3rem" }}>⚠ Issue / Note</p>
                        <p style={{ fontSize: "12px", color: "var(--ink)", lineHeight: 1.65 }}>{log.issues}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 05 COST TRACKER */}
      <SectionMarker n="05" title="Cost Tracker" />
      <div style={{ marginBottom: "1.25rem" }}><CostForm projectId={project.id} /></div>

      <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem 1.5rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Budget vs Actual</p>
          <p style={{ fontSize: "11px", color: "var(--ink-faint)" }}>{formatCurrency(totalCosts)} spent · {formatCurrency(budgetTotal - totalCosts)} remaining</p>
        </div>
        {Object.entries(budgetByCat).map(([cat, budget]) => {
          const spent = costByCat[cat] || 0
          const pct = Math.min(Math.round(spent / budget * 100), 100)
          const over = spent > budget
          return (
            <div key={cat} style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: COST_COLOR[cat] || "#ccc", display: "inline-block" }} />
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink)", textTransform: "capitalize" }}>{cat}</span>
                </div>
                <span style={{ fontSize: "12px", color: over ? "var(--terra)" : "var(--ink-faint)", fontWeight: over ? 600 : 400 }}>
                  {formatCurrency(spent)} / {formatCurrency(budget)} ({pct}%)
                </span>
              </div>
              <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: over ? "var(--terra)" : COST_COLOR[cat] || "var(--sage)", borderRadius: 3 }} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "var(--bg-subtle)" }}>
              {["Date","Description","Category","Vendor","Amount"].map((h, i) => (
                <th key={h} style={{ textAlign: i === 4 ? "right" : "left", padding: "0.65rem 1.25rem", fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(project.costs as any[]).map((cost: any, i: number) => (
              <tr key={cost.id || i} className="row-hover">
                <td style={{ padding: "0.75rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{formatDateShort(cost.date)}</td>
                <td style={{ padding: "0.75rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", color: "var(--ink)", fontWeight: 500 }}>{cost.description}</td>
                <td style={{ padding: "0.75rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "12px", color: "var(--ink-muted)" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: COST_COLOR[cost.category] || "#ccc", display: "inline-block" }} />
                    {cost.category}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", color: "var(--ink-faint)" }}>{cost.vendor || "—"}</td>
                <td style={{ padding: "0.75rem 1.25rem", borderBottom: i < project.costs.length-1 ? "1px solid var(--border)" : "none", textAlign: "right", fontFamily: "var(--font-serif), serif", color: "var(--ink)", fontWeight: 500 }}>{formatCurrency(cost.amount)}</td>
              </tr>
            ))}
            <tr style={{ background: "var(--bg-subtle)" }}>
              <td colSpan={4} style={{ padding: "0.75rem 1.25rem", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "var(--ink-muted)", letterSpacing: "0.05em", textTransform: "uppercase", borderTop: "1px solid var(--border)" }}>Total spent</td>
              <td style={{ padding: "0.75rem 1.25rem", textAlign: "right", fontFamily: "var(--font-serif), serif", fontSize: "1.1rem", color: "var(--ink)", fontWeight: 600, borderTop: "1px solid var(--border)" }}>{formatCurrency(totalCosts)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 06 INVOICE & COLLECTIONS */}
      <SectionMarker n="06" title="Invoice & Collections" />

      {(!project.invoices || (project.invoices as any[]).length === 0) ? (
        <div style={{ padding: "1.5rem", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--ink-faint)" }}>No invoices submitted yet.</p>
          <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "0.25rem" }}>Invoices will appear here once submitted to {project.client}.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {(project.invoices as any[]).map((inv: any) => {
            const holdbackAmt = Math.round(inv.gross_amount * inv.holdback_pct / 100)
            const netAmt = inv.gross_amount - holdbackAmt
            const isPaid = !!inv.paid_date
            const isSent = !!inv.sent_date

            return (
              <div key={inv.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.25rem", background: isPaid ? "var(--sage-light)" : isSent ? "var(--gold-light)" : "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Invoice #{inv.number}</span>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>{inv.type}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isPaid ? "var(--sage)" : isSent ? "var(--gold)" : "var(--ink-faint)", padding: "2px 8px", borderRadius: "4px", background: isPaid ? "rgba(90,122,90,0.1)" : isSent ? "rgba(196,150,58,0.1)" : "transparent" }}>
                    {isPaid ? "✓ Paid" : isSent ? "Sent · Awaiting Payment" : "Not Yet Sent"}
                  </span>
                </div>
                <div style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 2rem" }}>
                    <div>
                      <KVRow label="Gross amount"              value={formatCurrency(inv.gross_amount)} mono />
                      <KVRow label={`Holdback (${inv.holdback_pct}%)`} value={`− ${formatCurrency(holdbackAmt)}`} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.65rem 0", borderBottom: "2px solid var(--ink)" }}>
                        <span style={{ fontSize: "12px", color: "var(--ink)", fontWeight: 700 }}>Net billing</span>
                        <span style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.2rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatCurrency(netAmt)}</span>
                      </div>
                    </div>
                    <div>
                      <KVRow label="Sent"             value={inv.sent_date ? formatDate(inv.sent_date) : "Pending"} />
                      <KVRow label="Paid"             value={inv.paid_date ? formatDate(inv.paid_date) : "Pending"} />
                      <KVRow label="Holdback release" value={inv.holdback_release_date ? formatDate(inv.holdback_release_date) : "Pending"} />
                    </div>
                  </div>
                  {inv.notes && (
                    <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "1rem", lineHeight: 1.65, borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>{inv.notes}</p>
                  )}
                  {/* Invoice action buttons */}
                  {(!isPaid) && (
                    <InvoiceActions
                      projectId={project.id}
                      invoiceId={inv.id}
                      isSent={isSent}
                      isPaid={isPaid}
                    />
                  )}
                </div>
              </div>
            )
          })}

          {(project.invoices as any[]).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
              {[
                { label: "Total invoiced",  value: formatCurrency(totalInvoiced) },
                { label: "Total collected", value: formatCurrency(totalPaid) },
                { label: "Outstanding",     value: formatCurrency(totalInvoiced - totalPaid) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--bg)", padding: "1rem 1.25rem" }}>
                  <p style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.3rem" }}>{label}</p>
                  <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.2rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link back to bid */}
      {bid && (
        <div style={{ marginTop: "3rem", padding: "1rem 1.5rem", background: "var(--bg-subtle)", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)" }}>View original bid — {formatCurrency(bid.bid_value)} · {bid.estimator}</p>
          <Link href={`/bids/${bid.id}`} style={{ fontSize: "12px", color: "var(--terra)", textDecoration: "none" }}>Open bid file →</Link>
        </div>
      )}
    </div>
  )
}

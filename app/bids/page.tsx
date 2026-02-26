"use client"
import { useState, useEffect, useMemo } from "react"
import { formatCurrency, formatDate, daysUntil, STATUS_COLOR } from "@/lib/utils"
import { StatusDot } from "@/components/StatusDot"
import Link from "next/link"

type BidStatus = 'active' | 'sent' | 'won' | 'lost' | 'no-bid'
type SortKey   = 'project_name' | 'client' | 'bid_value' | 'deadline' | 'margin_pct'
type SortDir   = 'asc' | 'desc'

const STAGES: { key: BidStatus; label: string }[] = [
  { key: 'active',   label: 'Estimating' },
  { key: 'sent',     label: 'Submitted' },
  { key: 'won',      label: 'Won' },
  { key: 'lost',     label: 'Lost' },
  { key: 'no-bid',   label: 'No Bid' },
]

const BOARD_COLUMNS = [
  { key: 'estimating', statuses: ['active'],        label: 'Estimating', color: '#4a6fa8' },
  { key: 'submitted',  statuses: ['sent'],          label: 'Submitted',  color: '#c4963a' },
  { key: 'won',        statuses: ['won'],           label: 'Won',        color: '#5a7a5a' },
  { key: 'closed',     statuses: ['lost','no-bid'], label: 'Closed',     color: '#b5afa5' },
]

const SORT_LABEL: Record<SortKey, string> = {
  project_name: 'Project', client: 'Client', bid_value: 'Value',
  deadline: 'Deadline', margin_pct: 'Margin',
}

export default function PipelinePage() {
  const [view,         setView]         = useState<'list' | 'board'>('list')
  const [bids,         setBids]         = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [filterStatus, setFilterStatus] = useState<BidStatus | null>(null)
  const [search,       setSearch]       = useState('')
  const [sortKey,      setSortKey]      = useState<SortKey>('deadline')
  const [sortDir,      setSortDir]      = useState<SortDir>('asc')

  useEffect(() => {
    fetch('/api/bids')
      .then(r => r.json())
      .then(data => { setBids(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Filter + search + sort
  const filtered = useMemo(() => {
    let out = [...bids]
    if (filterStatus) out = out.filter(b => b.status === filterStatus)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter(b =>
        b.project_name?.toLowerCase().includes(q) ||
        b.client?.toLowerCase().includes(q) ||
        b.estimator?.toLowerCase().includes(q)
      )
    }
    out.sort((a, b) => {
      let va = a[sortKey] ?? ''
      let vb = b[sortKey] ?? ''
      if (sortKey === 'deadline') {
        va = new Date(va).getTime()
        vb = new Date(vb).getTime()
      } else if (sortKey === 'bid_value' || sortKey === 'margin_pct') {
        va = Number(va) || 0
        vb = Number(vb) || 0
      } else {
        va = String(va).toLowerCase()
        vb = String(vb).toLowerCase()
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return out
  }, [bids, filterStatus, search, sortKey, sortDir])

  const pipeline = bids.filter(b => b.status === 'active' || b.status === 'sent').reduce((s, b) => s + b.bid_value, 0)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ color: "var(--border)", marginLeft: "0.25rem" }}>↕</span>
    return <span style={{ color: "var(--terra)", marginLeft: "0.25rem" }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const colHeaders: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'project_name', label: 'Project',  align: 'left'  },
    { key: 'client',       label: 'Client',   align: 'left'  },
    { key: 'bid_value',    label: 'Value',    align: 'right' },
    { key: 'deadline',     label: 'Deadline', align: 'left'  },
  ]

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.5rem" }}>
            {loading ? "Loading…" : `${bids.length} bids · ${formatCurrency(pipeline)} in pipeline`}
          </p>
          <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)" }}>
            Pipeline
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {(['list','board'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "0.45rem 1rem", fontSize: "12px", fontWeight: 500,
                background: view === v ? "var(--ink)" : "transparent",
                color: view === v ? "var(--bg)" : "var(--ink-muted)",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "0.02em", transition: "background 0.12s, color 0.12s",
              }}>
                {v === 'list' ? '≡  List' : '⊞  Board'}
              </button>
            ))}
          </div>
          <Link href="/bids/new" style={{ padding: "0.6rem 1.25rem", background: "var(--ink)", color: "var(--bg)", borderRadius: "8px", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
            + New Bid
          </Link>
        </div>
      </div>

      {/* Stage summary — clickable filters */}
      <div className="stage-strip" style={{ gap: "0", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", marginBottom: "1.25rem" }}>
        {STAGES.map(({ key, label }, i) => {
          const count    = bids.filter(b => b.status === key).length
          const val      = bids.filter(b => b.status === key).reduce((s, b) => s + b.bid_value, 0)
          const isActive = filterStatus === key
          return (
            <button key={key} onClick={() => setFilterStatus(isActive ? null : key)} style={{
              flex: 1, padding: "1rem 1.25rem", background: isActive ? "var(--ink)" : "var(--bg)",
              borderRight: i < STAGES.length - 1 ? "1px solid var(--border)" : "none",
              border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              transition: "background 0.12s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "white" : STATUS_COLOR[key], display: "inline-block" }} />
                <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: isActive ? "rgba(255,255,255,0.7)" : "var(--ink-faint)", fontWeight: 500 }}>{label}</span>
              </div>
              <p style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.5rem", color: isActive ? "white" : "var(--ink)", letterSpacing: "-0.02em" }}>
                {loading ? "—" : count}
              </p>
              {val > 0 && <p style={{ fontSize: "11px", color: isActive ? "rgba(255,255,255,0.6)" : "var(--ink-faint)", marginTop: "0.2rem" }}>{formatCurrency(val)}</p>}
            </button>
          )
        })}
      </div>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "var(--ink-faint)", pointerEvents: "none" }}>⌕</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search project, client, estimator…"
            style={{
              width: "100%", padding: "0.6rem 0.85rem 0.6rem 2.2rem",
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "8px", fontSize: "13px", color: "var(--ink)",
              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>
        {(filterStatus || search) && (
          <button onClick={() => { setFilterStatus(null); setSearch('') }} style={{
            padding: "0.6rem 1rem", fontSize: "12px", color: "var(--ink-muted)",
            background: "var(--bg-subtle)", border: "1px solid var(--border)",
            borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}>
            Clear filters ×
          </button>
        )}
        <span style={{ fontSize: "12px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
          {!loading && filtered.length !== bids.length ? `${filtered.length} of ${bids.length}` : ""}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--ink-faint)", fontSize: "13px" }}>Loading pipeline…</div>
      ) : view === 'list' ? (

        /* LIST VIEW */
        <div className="table-scroll" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--ink-faint)", fontSize: "13px" }}>
              No bids match your filters.{" "}
              <button onClick={() => { setFilterStatus(null); setSearch('') }} style={{ background: "none", border: "none", color: "var(--terra)", cursor: "pointer", fontFamily: "inherit", fontSize: "13px" }}>Clear</button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr>
                  {colHeaders.map(({ key, label, align }) => (
                    <th key={key} onClick={() => handleSort(key)} style={{
                      textAlign: align, padding: "0.7rem 1.5rem",
                      fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase",
                      color: sortKey === key ? "var(--terra)" : "var(--ink-faint)",
                      fontWeight: 500, borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                    }}>
                      {label}<SortIcon col={key} />
                    </th>
                  ))}
                  <th className="col-hide-mobile" style={{ textAlign: "left", padding: "0.7rem 1.5rem", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>Stage</th>
                  <th className="col-hide-mobile" style={{ textAlign: "left", padding: "0.7rem 1.5rem", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>Est.</th>
                  <th onClick={() => handleSort('margin_pct')} style={{
                    textAlign: "right", padding: "0.7rem 1.5rem",
                    fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase",
                    color: sortKey === 'margin_pct' ? "var(--terra)" : "var(--ink-faint)",
                    fontWeight: 500, borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                  }}>
                    Margin<SortIcon col="margin_pct" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bid, i) => {
                  const days   = daysUntil(bid.deadline)
                  const urgent = days <= 7 && !['won','lost','no-bid'].includes(bid.status)
                  const border = i < filtered.length - 1 ? "1px solid var(--border)" : "none"
                  return (
                    <tr key={bid.id} className="row-hover">
                      <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
                        <Link href={`/bids/${bid.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}>{bid.project_name}</Link>
                      </td>
                      <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{bid.client}</td>
                      <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, textAlign: "right", fontWeight: 500, fontFamily: "var(--font-serif), serif", whiteSpace: "nowrap" }}>
                        {formatCurrency(bid.bid_value)}
                      </td>
                      <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, whiteSpace: "nowrap" }}>
                        <span style={{ color: urgent ? "var(--terra)" : "var(--ink-muted)" }}>{formatDate(bid.deadline)}</span>
                        {urgent && <span style={{ marginLeft: "0.4rem", fontSize: "11px", background: "var(--terra-light)", color: "var(--terra)", padding: "1px 5px", borderRadius: "4px", fontWeight: 500 }}>{days}d</span>}
                      </td>
                      <td className="col-hide-mobile" style={{ padding: "0.9rem 1.5rem", borderBottom: border }}><StatusDot status={bid.status} /></td>
                      <td className="col-hide-mobile" style={{ padding: "0.9rem 1.5rem", borderBottom: border, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{bid.estimator}</td>
                      <td style={{ padding: "0.9rem 1.5rem", borderBottom: border, textAlign: "right", color: bid.margin_pct ? "var(--sage)" : "var(--ink-faint)", whiteSpace: "nowrap" }}>
                        {bid.margin_pct != null ? `${bid.margin_pct}%` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      ) : (

        /* BOARD VIEW */
        <div className="board-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", alignItems: "start" }}>
          {BOARD_COLUMNS.map(col => {
            const colBids  = filtered.filter(b => col.statuses.includes(b.status))
              .sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            const colValue = colBids.reduce((s, b) => s + b.bid_value, 0)
            return (
              <div key={col.key}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)" }}>{col.label}</span>
                  <span style={{ fontSize: "11px", color: "var(--ink-faint)", marginLeft: "auto" }}>{colBids.length}</span>
                </div>
                {colValue > 0 && <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginBottom: "0.75rem", padding: "0 0.25rem" }}>{formatCurrency(colValue)}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {colBids.length === 0 ? (
                    <div style={{ padding: "1.5rem", border: "1px dashed var(--border)", borderRadius: "10px", textAlign: "center", color: "var(--ink-faint)", fontSize: "12px" }}>None</div>
                  ) : colBids.map(bid => {
                    const days   = daysUntil(bid.deadline)
                    const urgent = days <= 7 && !['won','lost','no-bid'].includes(bid.status)
                    return (
                      <Link key={bid.id} href={`/bids/${bid.id}`} style={{ textDecoration: "none" }}>
                        <div className="row-hover" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.1rem", cursor: "pointer", borderTop: `3px solid ${col.color}` }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "0.3rem", lineHeight: 1.3 }}>{bid.project_name}</p>
                          <p style={{ fontSize: "11px", color: "var(--ink-faint)", marginBottom: "0.85rem" }}>{bid.client}</p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "var(--font-serif), serif", fontSize: "1rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>{formatCurrency(bid.bid_value)}</span>
                            {urgent ? (
                              <span style={{ fontSize: "11px", background: "var(--terra-light)", color: "var(--terra)", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>{days}d</span>
                            ) : (
                              <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>{formatDate(bid.deadline)}</span>
                            )}
                          </div>
                          {bid.margin_pct != null && (
                            <div style={{ marginTop: "0.5rem", fontSize: "11px", color: "var(--sage)", fontWeight: 500 }}>{bid.margin_pct}% margin ✓</div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

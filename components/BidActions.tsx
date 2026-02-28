"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

type Status = 'active' | 'sent' | 'won' | 'lost' | 'no-bid'
type BidStatusLike = Status | 'invited' | 'estimating' | 'submitted' | 'decision' | string

const ACTIONS: { status: Status; label: string; color: string; bg: string }[] = [
  { status: 'sent',    label: 'Mark Sent',    color: 'var(--gold)', bg: 'var(--gold-light)' },
  { status: 'won',     label: 'Mark Won ✓',   color: 'var(--sage)', bg: 'var(--sage-light)' },
  { status: 'lost',    label: 'Mark Lost',    color: 'var(--terra)', bg: 'var(--terra-light)' },
  { status: 'no-bid',  label: 'No Bid',       color: 'var(--ink-faint)', bg: 'var(--accent-light)' },
]

const NEXT_STATUS: Record<Status, Status[]> = {
  active:   ['sent', 'no-bid'],
  sent:     ['won', 'lost'],
  won:      [],
  lost:     [],
  'no-bid': [],
}

interface Props {
  bidId: string
  currentStatus: BidStatusLike
  currentValue: number
}

function getAvailableStatuses(status: BidStatusLike): Status[] {
  if (status === 'invited' || status === 'estimating') return NEXT_STATUS.active
  if (status === 'submitted') return NEXT_STATUS.sent
  if (status === 'decision') return []
  return NEXT_STATUS[status as Status] ?? []
}

export default function BidActions({ bidId, currentStatus, currentValue }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<Status | null>(null)
  const [note, setNote]       = useState('')
  const [margin, setMargin]   = useState('')
  const [done, setDone]       = useState(false)

  const available = getAvailableStatuses(currentStatus)
  if (available.length === 0) return null

  async function act(status: Status) {
    setLoading(status)
    try {
      await fetch(`/api/bids/${bidId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          note:       note || undefined,
          margin_pct: status === 'won' && margin ? Number(margin) : undefined,
          by: 'JP',
        }),
      })
      setDone(true)
      setTimeout(() => router.refresh(), 800)
    } catch(e) {
      console.error(e)
    }
    setLoading(null)
  }

  if (done) {
    return (
      <div style={{ padding: "0.75rem 1.25rem", background: "var(--sage-light)", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "13px", color: "var(--sage)", fontWeight: 500 }}>
        ✓ Status updated — refreshing…
      </div>
    )
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem 1.5rem", background: "var(--bg-subtle)" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "1rem" }}>
        Update Status
      </p>

      {/* Note field */}
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a note (optional)…"
        style={{
          width: "100%", padding: "0.6rem 0.9rem",
          background: "var(--bg)", border: "1px solid var(--border)",
          borderRadius: "7px", fontSize: "13px", color: "var(--ink)",
          outline: "none", fontFamily: "inherit", marginBottom: "0.75rem",
          boxSizing: "border-box",
        }}
      />

      {/* Margin field — only if Won is available */}
      {available.includes('won') && (
        <input
          type="number"
          value={margin}
          onChange={e => setMargin(e.target.value)}
          placeholder="Margin % (if won)"
          min="0" max="100"
          style={{
            width: "100%", padding: "0.6rem 0.9rem",
            background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: "7px", fontSize: "13px", color: "var(--ink)",
            outline: "none", fontFamily: "inherit", marginBottom: "0.75rem",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {ACTIONS.filter(a => available.includes(a.status)).map(a => (
          <button
            key={a.status}
            disabled={!!loading}
            onClick={() => act(a.status)}
            style={{
              padding: "0.55rem 1.1rem",
              background: loading === a.status ? a.bg : "var(--bg)",
              color: a.color,
              border: `1px solid ${a.color}40`,
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: loading && loading !== a.status ? 0.5 : 1,
              transition: "background 0.15s",
            }}
          >
            {loading === a.status ? "Saving…" : a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

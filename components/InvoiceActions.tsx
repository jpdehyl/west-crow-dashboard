"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const today = () => new Date().toISOString().split('T')[0]

interface Props {
  projectId: string
  invoiceId: string
  isSent: boolean
  isPaid: boolean
}

export default function InvoiceActions({ projectId, invoiceId, isSent, isPaid }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [done, setDone] = useState({ sent: isSent, paid: isPaid })

  async function mark(field: 'sent_date' | 'paid_date') {
    setLoading(field)
    try {
      await fetch(`/api/projects/${projectId}/invoices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, [field]: today() }),
      })
      setDone(d => ({ ...d, [field === 'sent_date' ? 'sent' : 'paid']: true }))
      setTimeout(() => router.refresh(), 600)
    } catch (e) { console.error(e) }
    setLoading(null)
  }

  if (done.sent && done.paid) return null

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
      {!done.sent && (
        <button
          disabled={!!loading}
          onClick={() => mark('sent_date')}
          style={{
            padding: "0.45rem 0.9rem", fontSize: "12px", fontWeight: 600,
            color: "var(--gold)", border: "1px solid var(--gold)",
            background: "var(--bg)", borderRadius: "7px", cursor: "pointer", fontFamily: "inherit",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading === 'sent_date' ? "Saving…" : "Mark Sent"}
        </button>
      )}
      {done.sent && !done.paid && (
        <button
          disabled={!!loading}
          onClick={() => mark('paid_date')}
          style={{
            padding: "0.45rem 0.9rem", fontSize: "12px", fontWeight: 600,
            color: "var(--sage)", border: "1px solid var(--sage)",
            background: "var(--bg)", borderRadius: "7px", cursor: "pointer", fontFamily: "inherit",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading === 'paid_date' ? "Saving…" : "Mark Paid"}
        </button>
      )}
    </div>
  )
}

"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CloneBidButton({ bidId }: { bidId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClone() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bids/${bidId}/clone`, { method: "POST" })
      const data = await res.json()
      if (data?.id) {
        router.push(`/bids/${data.id}`)
      } else {
        alert("Clone failed — try again")
        setLoading(false)
      }
    } catch {
      alert("Clone failed — try again")
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClone}
      disabled={loading}
      style={{
        padding: "0.5rem 1rem",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: "7px",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--ink-muted)",
        cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: loading ? 0.6 : 1,
        transition: "border-color 0.12s, color 0.12s",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = "var(--ink-muted)"; e.currentTarget.style.color = "var(--ink)" } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--ink-muted)" }}
    >
      {loading ? "Cloning…" : "⎘ Clone Bid"}
    </button>
  )
}

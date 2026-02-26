import { getBid } from "@/lib/sheets"
import { notFound } from "next/navigation"
import Link from "next/link"
import EstimateBuilder from "@/components/EstimateBuilder"

export const dynamic = "force-dynamic"

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bid = await getBid(id) as any
  if (!bid) notFound()

  let saved = null
  try {
    if (bid.estimate_data) saved = JSON.parse(bid.estimate_data)
  } catch {}

  return (
    <div>
      <Link href={`/bids/${id}`} style={{ fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.25rem" }}>
        ← Back to Bid
      </Link>
      <EstimateBuilder bidId={id} bidName={bid.project_name} saved={saved} />
    </div>
  )
}

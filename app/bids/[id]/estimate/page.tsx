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

  // If clark_draft exists in estimate_data, confidence is in meta.clark_confidence
  const clarkDraft = saved?.clark_draft ?? null
  const clarkConfidence: number | null = saved?.meta?.clark_confidence ?? clarkDraft?.confidence ?? null

  return (
    <div>
      <Link
        href={`/bids/${id}`}
        style={{ fontSize: "13px", color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1.25rem" }}
      >
        ← Back to Bid
      </Link>

      {/* Clark Analyzed Banner */}
      {clarkDraft && clarkDraft.scope_summary && (
        <div style={{
          marginBottom: "1.25rem",
          padding: "1rem 1.25rem",
          background: "#f5f0ff",
          border: "1px solid #9b72e0",
          borderRadius: "10px",
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
        }}>
          <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#5b21b6", marginBottom: "0.3rem" }}>
              Clark analyzed this bid
              {clarkConfidence !== null && (
                <span style={{
                  marginLeft: "0.6rem",
                  padding: "1px 8px",
                  background: clarkConfidence >= 0.8 ? "#d1fae5" : clarkConfidence >= 0.5 ? "#fef9c3" : "#fee2e2",
                  color:      clarkConfidence >= 0.8 ? "#065f46" : clarkConfidence >= 0.5 ? "#713f12" : "#991b1b",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}>
                  {Math.round(clarkConfidence * 100)}% confidence
                </span>
              )}
            </p>
            <p style={{ fontSize: "12px", color: "#6d28d9", lineHeight: 1.5 }}>
              {clarkDraft.scope_summary}
            </p>
            {(clarkDraft.line_items?.length > 0) && (
              <p style={{ fontSize: "11px", color: "#7c3aed", marginTop: "0.3rem" }}>
                {clarkDraft.line_items.length} line item{clarkDraft.line_items.length !== 1 ? "s" : ""} pre-filled below
                {clarkDraft.hazmat_present ? " · ☣️ Hazmat detected" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      <EstimateBuilder bidId={id} bidName={bid.project_name} saved={saved} estimateSheetUrl={bid.estimate_sheet_url ?? null} />
    </div>
  )
}

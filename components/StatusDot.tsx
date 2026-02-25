import { BidStatus } from "@/lib/data"
import { STATUS_COLOR, statusLabel } from "@/lib/utils"

export function StatusDot({ status, showLabel = true }: { status: BidStatus; showLabel?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[status], display: "inline-block", flexShrink: 0 }} />
      {showLabel && <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{statusLabel(status)}</span>}
    </span>
  )
}

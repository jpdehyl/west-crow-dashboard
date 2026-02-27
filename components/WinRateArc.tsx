export function WinRateArc({ pct }: { pct: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" role="img" aria-label={`Win rate ${pct}%`}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--sage)"
        strokeWidth="4"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.3s ease" }}
      />
    </svg>
  )
}

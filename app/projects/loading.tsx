export default function Loading() {
  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ height: 22, width: 180, background: "#f7f2e9", borderRadius: 6, marginBottom: "1rem", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ height: 84, background: "#f7f2e9", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: 84, background: "#f7f2e9", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ height: 62, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  )
}

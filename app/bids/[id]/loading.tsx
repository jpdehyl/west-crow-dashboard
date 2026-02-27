export default function Loading() {
  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ height: 16, width: 110, background: "#f7f2e9", borderRadius: 6, marginBottom: "0.75rem", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ height: 32, width: 360, background: "#f7f2e9", borderRadius: 6, marginBottom: "0.9rem", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ height: 90, width: "100%", background: "#f7f2e9", borderRadius: 10, marginBottom: "0.75rem", animation: "pulse 1.5s ease-in-out infinite" }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ height: 64, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  )
}

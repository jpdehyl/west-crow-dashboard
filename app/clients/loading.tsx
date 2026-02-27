export default function Loading() {
  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ height: 22, width: 160, background: "#f7f2e9", borderRadius: 6, marginBottom: "1rem", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ height: 44, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: "0.75rem", animation: "pulse 1.5s ease-in-out infinite" }} />
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{ height: 54, width: "100%", background: "#f7f2e9", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  )
}

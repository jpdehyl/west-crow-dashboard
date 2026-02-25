"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const nav = [
  { href: "/", label: "Pipeline" },
  { href: "/bids", label: "All Bids" },
  { href: "/clients", label: "Clients" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: "220px",
      background: "var(--forest)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      padding: "0",
    }}>
      {/* Logo */}
      <div style={{
        padding: "2rem 1.75rem 1.5rem",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{
          fontSize: "10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          marginBottom: "0.3rem",
          fontWeight: 500,
        }}>West Crow</div>
        <div style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}>Contracting</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "1.25rem 0.75rem" }}>
        {nav.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              display: "block",
              padding: "0.6rem 1rem",
              marginBottom: "2px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: active ? 500 : 400,
              color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
              background: active ? "rgba(255,255,255,0.09)" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s ease",
              letterSpacing: "-0.01em",
            }}>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* New Bid */}
      <div style={{ padding: "1.25rem 0.75rem 2rem" }}>
        <Link href="/bids/new" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          padding: "0.65rem",
          background: "var(--amber)",
          color: "white",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
          letterSpacing: "0.01em",
          transition: "opacity 0.15s ease",
        }}>
          + New Bid
        </Link>
      </div>
    </aside>
  )
}

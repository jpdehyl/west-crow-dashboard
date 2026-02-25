"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/bids", label: "Pipeline" },
  { href: "/projects", label: "Projects" },
  { href: "/clients", label: "Clients" },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: "200px",
      minHeight: "100vh",
      background: "var(--bg-subtle)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Wordmark */}
      <div style={{ padding: "2.25rem 1.75rem 2rem" }}>
        <div style={{
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
          fontWeight: 500,
          marginBottom: "0.2rem",
        }}>West Crow</div>
        <div style={{
          fontFamily: "var(--font-serif), serif",
          fontSize: "1.35rem",
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
        }}>Contracting</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 1rem" }}>
        {nav.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className="nav-link"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.55rem 0.75rem",
                marginBottom: "1px",
                borderRadius: "7px",
                fontSize: "14px",
                fontWeight: active ? 500 : 400,
                color: active ? "var(--ink)" : "var(--ink-muted)",
                background: active ? "var(--bg)" : "transparent",
                textDecoration: "none",
                borderLeft: active ? "2px solid var(--terra)" : "2px solid transparent",
              }}>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* CTA */}
      <div style={{ padding: "1.5rem 1rem 2.25rem" }}>
        <Link href="/bids/new" style={{
          display: "block",
          textAlign: "center",
          padding: "0.6rem",
          background: "var(--ink)",
          color: "var(--bg)",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
          letterSpacing: "0.01em",
        }}>+ New Bid</Link>
      </div>
    </aside>
  )
}

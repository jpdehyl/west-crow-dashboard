"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/",          label: "Home",     icon: "⌂" },
  { href: "/bids",      label: "Pipeline", icon: "◈" },
  { href: "/projects",  label: "Projects", icon: "◉" },
  { href: "/clients",   label: "Clients",  icon: "◎" },
  { href: "/analytics", label: "Analytics",icon: "◇" },
]

export function MobileHeader() {
  return (
    <header className="mobile-header" style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)",
      padding: "0.85rem 1.25rem",
      alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 600 }}>West Crow</div>
        <div style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.1rem", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Contracting</div>
      </div>
      <Link href="/bids/new" style={{
        padding: "0.5rem 1rem", background: "var(--terra)", color: "#ffffff",
        borderRadius: "7px", fontSize: "12px", fontWeight: 500, textDecoration: "none",
      }}>
        + Bid
      </Link>
    </header>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="mobile-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "var(--bg-subtle)", borderTop: "1px solid var(--border)",
      justifyContent: "space-around", alignItems: "center",
      padding: "0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom))",
    }}>
      {NAV.map(({ href, label, icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href))
        return (
          <Link key={href} href={href} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "0.2rem", textDecoration: "none", padding: "0.35rem 0.75rem",
            borderRadius: "8px", transition: "background 0.12s",
            background: active ? "var(--bg)" : "transparent",
          }}>
            <span style={{ fontSize: "16px", color: active ? "var(--terra)" : "var(--ink-faint)" }}>{icon}</span>
            <span style={{ fontSize: "10px", fontWeight: active ? 600 : 400, color: active ? "var(--ink)" : "var(--ink-faint)", letterSpacing: "0.04em" }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

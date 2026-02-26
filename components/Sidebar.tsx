"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { LogoFull, LogoIcon } from "./Logo"

const nav = [
  { href: "/bids", label: "Pipeline", icon: "📋" },
  { href: "/projects", label: "Projects", icon: "🏗" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", String(collapsed))
    }
  }, [collapsed, mounted])

  const width = collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)"

  return (
    <aside className="sidebar-transition" style={{
      width,
      minWidth: width,
      minHeight: "100vh",
      background: "var(--sidebar-bg)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      position: "relative",
    }}>
      <div style={{ padding: collapsed ? "1.5rem 0.5rem 1rem" : "1.5rem 1.25rem 1rem" }}>
        {collapsed ? <LogoIcon /> : <LogoFull />}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: "absolute",
          top: "1.6rem",
          right: "-12px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "#2d2d2d",
          border: "2px solid var(--border)",
          color: "#ffffff",
          fontSize: "12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          lineHeight: 1,
        }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </button>

      <nav style={{ flex: 1, padding: collapsed ? "0.5rem 0.4rem" : "0.5rem 0.75rem", marginTop: "0.5rem" }}>
        {nav.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className="nav-link"
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: collapsed ? "0.55rem 0" : "0.55rem 0.75rem",
                marginBottom: "2px",
                borderRadius: "7px",
                fontSize: "14px",
                fontWeight: active ? 500 : 400,
                color: active ? "#ffffff" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(255,255,255,0.1)" : "transparent",
                textDecoration: "none",
                justifyContent: collapsed ? "center" : "flex-start",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}>
              <span style={{ fontSize: "16px", flexShrink: 0, width: "20px", textAlign: "center" }}>{icon}</span>
              {!collapsed && <span className="sidebar-fade">{label}</span>}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: collapsed ? "1.5rem 0.5rem 2rem" : "1.5rem 0.75rem 2rem" }}>
        <Link href="/bids/new" title={collapsed ? "+ New Bid" : undefined} style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          padding: "0.6rem",
          background: "#ffffff",
          color: "#1a1a1a",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          textDecoration: "none",
          letterSpacing: "0.01em",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}>
          {collapsed ? "+" : "+ New Bid"}
        </Link>
      </div>
    </aside>
  )
}

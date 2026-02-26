"use client"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/")
    }
  }, [status, router])

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100,
      }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--border)", borderTopColor: "var(--ink)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    )
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: "var(--sidebar-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path
                d="M12 28 C12 28 14 22 16 20 C18 18 20 17.5 20 17.5 C20 17.5 18.5 16 17 15 C15.5 14 14 14 14 14 C14 14 16 12 20 12 C24 12 26 14 27 16 C28 18 28 20 27.5 22 C27 24 25 26 23 27.5 C21 29 18 29 18 29 L28 29"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
              />
              <circle cx="22" cy="15" r="1.2" fill="white" />
            </svg>
          </div>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500, marginBottom: "0.3rem" }}>
            West Crow
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Contracting
          </div>
        </div>

        <p style={{ fontSize: "14px", color: "var(--ink-muted)", marginBottom: "2rem" }}>
          Sign in to access the bid pipeline
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.75rem 1.5rem",
            background: "var(--ink)", color: "#fff",
            border: "none", borderRadius: "9px",
            fontSize: "14px", fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
            margin: "0 auto",
            width: "100%", justifyContent: "center",
            transition: "opacity 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#fff" fillOpacity=".9"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#fff" fillOpacity=".8"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#fff" fillOpacity=".7"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#fff" fillOpacity=".6"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ fontSize: "12px", color: "var(--ink-faint)", marginTop: "1.5rem" }}>
          Only authorized West Crow accounts can access this dashboard.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

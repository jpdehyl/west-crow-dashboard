"use client"
import Link from "next/link"

export function LogoFull({ className }: { className?: string }) {
  return (
    <Link href="/" style={{ textDecoration: "none", display: "block" }} className={className}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <CrowMark size={32} />
        <div>
          <div style={{
            fontSize: "13px",
            letterSpacing: "0.16em",
            textTransform: "uppercase" as const,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 500,
            lineHeight: 1.2,
          }}>West Crow</div>
          <div style={{
            fontFamily: "var(--font-serif), serif",
            fontSize: "1.15rem",
            color: "#ffffff",
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
          }}>Contracting</div>
        </div>
      </div>
    </Link>
  )
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <Link href="/" style={{ textDecoration: "none", display: "flex", justifyContent: "center" }} className={className}>
      <CrowMark size={28} />
    </Link>
  )
}

function CrowMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#2d2d2d" />
      <path
        d="M12 28 C12 28 14 22 16 20 C18 18 20 17.5 20 17.5 C20 17.5 18.5 16 17 15 C15.5 14 14 14 14 14 C14 14 16 12 20 12 C24 12 26 14 27 16 C28 18 28 20 27.5 22 C27 24 25 26 23 27.5 C21 29 18 29 18 29 L28 29"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="15" r="1.2" fill="white" />
    </svg>
  )
}

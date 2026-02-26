import type { Metadata } from "next"
import { DM_Sans, DM_Serif_Display } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/Sidebar"
import { MobileHeader, MobileBottomNav } from "@/components/MobileNav"

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["300","400","500","600"] })
const dmSerif = DM_Serif_Display({ subsets: ["latin"], variable: "--font-serif", weight: "400" })

export const metadata: Metadata = {
  title: "West Crow",
  description: "Bid pipeline",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable}`}
        style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Desktop sidebar */}
          <div className="sidebar">
            <Sidebar />
          </div>

          {/* Mobile header + content + bottom nav */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <MobileHeader />
            <main className="main-content" style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
              {children}
            </main>
            <MobileBottomNav />
          </div>
        </div>
      </body>
    </html>
  )
}

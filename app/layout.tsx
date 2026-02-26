import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/Sidebar"
import { MobileHeader, MobileBottomNav } from "@/components/MobileNav"

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["300","400","500","600"] })

export const metadata: Metadata = {
  title: "West Crow",
  description: "Bid pipeline",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={dmSans.variable}
        style={{ fontFamily: "var(--font-sans), sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
<<<<<<< HEAD
          <Sidebar />
          <main style={{
            flex: 1,
            minWidth: 0,
            padding: "1.5rem 2rem",
            overflowY: "auto",
            background: "var(--bg)",
          }}>
            {children}
          </main>
=======
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
>>>>>>> a24d7b81b04fcfeba19bacfaae79238e9ca84a30
        </div>
      </body>
    </html>
  )
}

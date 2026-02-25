"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ClipboardList, Users, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bids", label: "All Bids", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 bg-[#0f1f3d] text-white flex flex-col min-h-screen shrink-0">
      <div className="px-6 py-7 border-b border-white/10">
        <div className="text-xs font-semibold tracking-widest text-white/40 uppercase mb-1">West Crow</div>
        <div className="text-lg font-bold text-white leading-tight">Contracting</div>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 pb-6">
        <Link
          href="/bids/new"
          className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Bid
        </Link>
      </div>
    </aside>
  )
}

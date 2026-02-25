import { BIDS } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil, statusLabel, statusColor } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { TrendingUp, FileText, DollarSign, Target } from "lucide-react"

export default function DashboardPage() {
  const active = BIDS.filter(b => b.status === 'active')
  const sent = BIDS.filter(b => b.status === 'sent')
  const won = BIDS.filter(b => b.status === 'won')
  const decided = BIDS.filter(b => b.status === 'won' || b.status === 'lost')
  const winRate = decided.length > 0 ? Math.round((won.length / decided.length) * 100) : 0
  const pipeline = [...active, ...sent].reduce((sum, b) => sum + b.bid_value, 0)

  const kpis = [
    { label: "Active Bids", value: active.length, icon: FileText, color: "text-blue-600" },
    { label: "Sent / Pending", value: sent.length, icon: TrendingUp, color: "text-amber-600" },
    { label: "Pipeline Value", value: formatCurrency(pipeline), icon: DollarSign, color: "text-emerald-600" },
    { label: "Win Rate", value: `${winRate}%`, icon: Target, color: "text-purple-600" },
  ]

  // Sort: deadline soonest first, excluding no-bid/lost
  const tableBids = [...BIDS]
    .filter(b => b.status !== 'no-bid' && b.status !== 'lost')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .concat(BIDS.filter(b => b.status === 'no-bid' || b.status === 'lost'))

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bid Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Bids Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Active Bids</h2>
          <Link href="/bids" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Project</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Client</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Value</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Deadline</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {tableBids.map((bid) => {
              const days = daysUntil(bid.deadline)
              const urgentDeadline = days <= 7 && bid.status !== 'won' && bid.status !== 'lost' && bid.status !== 'no-bid'
              return (
                <tr key={bid.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link href={`/bids/${bid.id}`} className="hover:text-blue-600 transition-colors">
                      {bid.project_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{bid.client}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(bid.bid_value)}</td>
                  <td className={cn("px-6 py-4", urgentDeadline ? "text-orange-600 font-medium" : "text-gray-500")}>
                    {formatDate(bid.deadline)}
                    {urgentDeadline && <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{days}d</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", statusColor(bid.status))}>
                      {statusLabel(bid.status)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

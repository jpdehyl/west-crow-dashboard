import { BIDS } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil, statusLabel, statusColor, cn } from "@/lib/utils"
import Link from "next/link"
import { Plus } from "lucide-react"

export default function BidsPage() {
  const sorted = [...BIDS].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Bids</h1>
          <p className="text-sm text-gray-500 mt-1">{BIDS.length} bids total</p>
        </div>
        <Link
          href="/bids/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Bid
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Project</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Client</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Value</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Deadline</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Estimator</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Margin</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((bid) => {
              const days = daysUntil(bid.deadline)
              const urgent = days <= 7 && bid.status !== 'won' && bid.status !== 'lost' && bid.status !== 'no-bid'
              return (
                <tr key={bid.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link href={`/bids/${bid.id}`} className="hover:text-blue-600">{bid.project_name}</Link>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{bid.client}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(bid.bid_value)}</td>
                  <td className={cn("px-6 py-4", urgent ? "text-orange-600 font-medium" : "text-gray-500")}>
                    {formatDate(bid.deadline)}
                    {urgent && <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{days}d</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{bid.estimator}</td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {bid.margin_pct != null ? `${bid.margin_pct}%` : '—'}
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

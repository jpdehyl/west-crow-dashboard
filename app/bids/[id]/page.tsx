import { BIDS } from "@/lib/data"
import { formatCurrency, formatDate, daysUntil, statusLabel, statusColor, cn } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, User, DollarSign } from "lucide-react"

export default function BidDetailPage({ params }: { params: { id: string } }) {
  const bid = BIDS.find(b => b.id === params.id)
  if (!bid) notFound()

  const days = daysUntil(bid.deadline)
  const urgent = days <= 7 && bid.status !== 'won' && bid.status !== 'lost' && bid.status !== 'no-bid'

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/bids" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Bids
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{bid.project_name}</h1>
          <p className="text-gray-500 mt-1">{bid.client}</p>
        </div>
        <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border", statusColor(bid.status))}>
          {statusLabel(bid.status)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
            <DollarSign size={13} /> Bid Value
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(bid.bid_value)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
            <Calendar size={13} /> Deadline
          </div>
          <div className={cn("text-xl font-bold", urgent ? "text-orange-600" : "text-gray-900")}>
            {formatDate(bid.deadline)}
          </div>
          {urgent && <div className="text-xs text-orange-500 mt-1">{days} days left</div>}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">
            <User size={13} /> Estimator
          </div>
          <div className="text-xl font-bold text-gray-900">{bid.estimator}</div>
          {bid.margin_pct != null && <div className="text-xs text-gray-500 mt-1">Margin: {bid.margin_pct}%</div>}
        </div>
      </div>

      {bid.notes && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Notes</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{bid.notes}</p>
        </div>
      )}
    </div>
  )
}

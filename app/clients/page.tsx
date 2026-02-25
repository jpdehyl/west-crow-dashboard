import { CLIENTS, BIDS } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"
import { Building2, Phone, Mail } from "lucide-react"

export default function ClientsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">{CLIENTS.length} clients on record</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CLIENTS.map(client => {
          const clientBids = BIDS.filter(b => b.client === client.name)
          const won = clientBids.filter(b => b.status === 'won')
          const totalWon = won.reduce((s, b) => s + b.bid_value, 0)
          const winRate = clientBids.filter(b => b.status === 'won' || b.status === 'lost').length > 0
            ? Math.round(won.length / clientBids.filter(b => b.status === 'won' || b.status === 'lost').length * 100)
            : null

          return (
            <div key={client.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-gray-500" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{client.name}</div>
                  <div className="text-sm text-gray-500">{client.contact_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Mail size={14} />
                  <span className="text-gray-600">{client.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Phone size={14} />
                  <span className="text-gray-600">{client.phone}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{formatCurrency(totalWon)}</div>
                  <div className="text-xs text-gray-400">{clientBids.length} bids{winRate != null ? ` · ${winRate}% win rate` : ''}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

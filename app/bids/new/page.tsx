"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CLIENTS } from "@/lib/data"

export default function NewBidPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // TODO: POST to API route → Google Sheets
    await new Promise(r => setTimeout(r, 800))
    setLoading(false)
    router.push("/bids")
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/bids" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to Bids
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Bid</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name <span className="text-red-400">*</span></label>
            <input required name="project_name" type="text" placeholder="e.g. Burnaby Office Demo" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Client <span className="text-red-400">*</span></label>
              <select required name="client" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition bg-white">
                <option value="">Select client…</option>
                {CLIENTS.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="__new">+ New client</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimator</label>
              <select name="estimator" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition bg-white">
                <option value="JP">JP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bid Value (CAD) <span className="text-red-400">*</span></label>
              <input required name="bid_value" type="number" min="0" step="500" placeholder="150000" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bid Deadline <span className="text-red-400">*</span></label>
              <input required name="deadline" type="date" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea name="notes" rows={3} placeholder="Scope summary, special conditions, subcontractors…" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/bids" className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2.5 rounded-lg transition">Cancel</Link>
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              {loading ? "Saving…" : "Save Bid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

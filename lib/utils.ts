import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BidStatus } from "./data"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(dateStr)
  deadline.setHours(0, 0, 0, 0)
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function statusLabel(status: BidStatus): string {
  const labels: Record<BidStatus, string> = {
    active: 'Active',
    sent: 'Sent',
    won: 'Won',
    lost: 'Lost',
    'no-bid': 'No Bid',
  }
  return labels[status]
}

export function statusColor(status: BidStatus): string {
  const colors: Record<BidStatus, string> = {
    active: 'bg-blue-100 text-blue-800 border-blue-200',
    sent: 'bg-amber-100 text-amber-800 border-amber-200',
    won: 'bg-green-100 text-green-800 border-green-200',
    lost: 'bg-red-100 text-red-800 border-red-200',
    'no-bid': 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return colors[status]
}

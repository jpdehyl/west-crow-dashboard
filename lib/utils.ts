import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BidStatus } from "./data"

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v)
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(d: string): string {
  return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function daysUntil(d: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const dl = new Date(d); dl.setHours(0,0,0,0)
  return Math.ceil((dl.getTime() - today.getTime()) / 86400000)
}

export function statusLabel(s: BidStatus): string {
  return { active: 'Active', sent: 'Sent', won: 'Won', lost: 'Lost', 'no-bid': 'No Bid' }[s]
}

export const STATUS_COLOR: Record<BidStatus, string> = {
  active:   '#4a6fa8',
  sent:     '#c4963a',
  won:      '#5a7a5a',
  lost:     '#b85042',
  'no-bid': '#b5afa5',
}

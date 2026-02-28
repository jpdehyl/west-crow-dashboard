import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { BidStatus } from "./data"

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v)
}

export function formatDate(d: string | null | undefined | number): string {
  if (!d && d !== 0) return "—"
  const date = new Date(d as any)
  if (isNaN(date.getTime()) || date.getFullYear() < 1990) return "—"
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(d: string | null | undefined | number): string {
  if (!d && d !== 0) return "—"
  const date = new Date(d as any)
  if (isNaN(date.getTime()) || date.getFullYear() < 1990) return "—"
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function daysUntil(d: string | null | undefined | number): number {
  if (!d && d !== 0) return Infinity
  const dl = new Date(d as any)
  if (isNaN(dl.getTime()) || dl.getFullYear() < 1990) return Infinity
  const today = new Date(); today.setHours(0,0,0,0)
  dl.setHours(0,0,0,0)
  return Math.ceil((dl.getTime() - today.getTime()) / 86400000)
}

export function statusLabel(s: BidStatus): string {
  return { active: 'Active', sent: 'Sent', won: 'Won', lost: 'Lost', 'no-bid': 'No Bid' }[s]
}

export const STATUS_COLOR: Record<BidStatus, string> = {
  active:   '#3b6fa0',
  sent:     '#b8860b',
  won:      '#3d8c5c',
  lost:     '#c45042',
  'no-bid': '#a3a3a3',
}

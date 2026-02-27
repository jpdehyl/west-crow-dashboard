// POST /api/sync/calendar  (GET also accepted for Vercel cron)
// Fetches iCal feed and syncs bid deadlines.

import { NextResponse } from 'next/server'
import { getBids, createBid, updateBid } from '@/lib/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Strip common prefixes to extract a bare project name
const PREFIXES = ['** bid due -', 'bid due -', 'rfq -', '**']
function extractProjectName(summary: string): string {
  let s = summary.trim().toLowerCase()
  for (const pfx of PREFIXES) {
    if (s.startsWith(pfx)) {
      s = s.slice(pfx.length).trim()
    }
  }
  // Return title-cased version using the original after stripping length
  const stripped = summary.trim().slice(summary.trim().length - s.length - (summary.trim().length - summary.trim().toLowerCase().slice(summary.trim().toLowerCase().length - s.length).length))
  // Simpler: just return trimmed original minus the prefix portion
  const lower = summary.toLowerCase().trim()
  for (const pfx of PREFIXES) {
    if (lower.startsWith(pfx)) {
      return summary.trim().slice(pfx.length).trim()
    }
  }
  return summary.trim()
}

function parseIcal(raw: string) {
  const events: { summary: string; dtstart: string; location?: string; description?: string }[] = []
  const blocks = raw.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    const get = (key: string) => {
      const m = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`))
      return m ? m[1].trim() : ''
    }
    const summary = get('SUMMARY')
    const dtstart = get('DTSTART')
    const location = get('LOCATION')
    const description = get('DESCRIPTION')
    if (summary && dtstart) events.push({ summary, dtstart, location, description })
  }
  return events
}

function parseDtstart(dtstart: string): string {
  // DTSTART;VALUE=DATE:20260315  or  DTSTART:20260315T120000Z
  const digits = dtstart.replace(/[^0-9]/g, '')
  const y = digits.slice(0, 4)
  const m = digits.slice(4, 6)
  const d = digits.slice(6, 8)
  return `${y}-${m}-${d}`
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  const wb = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  let count = 0
  for (const w of wa) if (wb.has(w)) count++
  return count
}

export async function GET() {
  return POST()
}

export async function POST() {
  const icalUrl = process.env.ICAL_FEED_URL
  if (!icalUrl) return NextResponse.json({ error: 'ICAL_FEED_URL not set' }, { status: 500 })

  const res = await fetch(icalUrl, { cache: 'no-store' })
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch iCal feed' }, { status: 502 })

  const raw = await res.text()
  const events = parseIcal(raw)

  const summary = { matched: 0, created: 0, skipped: 0 }
  const bids = await getBids()

  for (const ev of events) {
    const s = ev.summary
    const isBidEvent = /bid due/i.test(s) || /rfq/i.test(s) || s.includes('**')
    if (!isBidEvent) { summary.skipped++; continue }

    const projectName = extractProjectName(s)
    const deadline = parseDtstart(ev.dtstart)

    // Fuzzy match existing bids
    let bestMatch: any = null
    let bestScore = 0
    for (const bid of bids) {
      const score = wordOverlap(projectName, bid.project_name ?? '')
      if (score > bestScore) { bestScore = score; bestMatch = bid }
    }

    if (bestMatch && bestScore >= 1) {
      // Only update deadline if not already set
      if (!bestMatch.deadline) {
        await updateBid(bestMatch.id, { deadline })
        summary.matched++
      } else {
        summary.skipped++
      }
    } else {
      // Create stub bid
      const id = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      await createBid({
        id: `cal-${id}-${deadline}`,
        project_name: projectName,
        deadline,
        status: 'active',
        source: 'calendar',
        timeline: [],
        documents: [],
      })
      summary.created++
    }
  }

  return NextResponse.json(summary)
}

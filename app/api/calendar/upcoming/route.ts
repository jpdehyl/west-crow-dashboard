import { NextResponse } from "next/server"

type CalendarEvent = {
  linked: boolean
  title: string
  date: string
  daysUntil: number
  bucket: "critical" | "soon" | "upcoming" | "later"
}

function parseDTSTART(raw: string): Date | null {
  const val = raw.replace(/^[^:]+:/, "").trim()
  if (val.length >= 15) {
    const y = val.slice(0, 4)
    const mo = val.slice(4, 6)
    const d = val.slice(6, 8)
    const h = val.slice(9, 11) || "00"
    const m = val.slice(11, 13) || "00"
    const s = val.slice(13, 15) || "00"
    const isUtc = val.endsWith("Z")
    const iso = `${y}-${mo}-${d}T${h}:${m}:${s}${isUtc ? "Z" : ""}`
    const dt = new Date(iso)
    return isNaN(dt.getTime()) ? null : dt
  }
  if (val.length === 8) {
    const iso = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`
    const dt = new Date(iso)
    return isNaN(dt.getTime()) ? null : dt
  }
  return null
}

function cleanSummary(raw: string): string {
  return raw
    .replace(/^\*\*\s*Bid due\s*[-–]\s*/i, "")
    .replace(/^RFQ\s*[-–]\s*/i, "")
    .trim()
}

function getBucket(days: number): "critical" | "soon" | "upcoming" | "later" | null {
  if (days < 0 || days > 60) return null
  if (days <= 3) return "critical"
  if (days <= 7) return "soon"
  if (days <= 30) return "upcoming"
  return "later"
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((b.getTime() - a.getTime()) / msPerDay)
}

export async function GET() {
  const feedUrl = process.env.ICAL_FEED_URL
  if (!feedUrl) {
    return NextResponse.json({ error: "ICAL_FEED_URL not set" }, { status: 500 })
  }

  try {
    const res = await fetch(feedUrl, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`)
    const text = await res.text()

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const events: CalendarEvent[] = []
    const blocks = text.split("BEGIN:VEVENT")
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i]
      const summaryMatch = block.match(/^SUMMARY[;:](.+)$/m)
      const dtStartMatch = block.match(/^DTSTART[;:](.+)$/m)
      if (!summaryMatch || !dtStartMatch) continue

      const rawSummary = summaryMatch[1].trim()
      const rawDTSTART = dtStartMatch[1].trim()

      const dt = parseDTSTART(rawDTSTART)
      if (!dt) continue

      const eventDate = new Date(dt)
      eventDate.setHours(0, 0, 0, 0)

      const daysUntil = daysBetween(now, eventDate)
      const bucket = getBucket(daysUntil)
      if (!bucket) continue

      events.push({
        title: cleanSummary(rawSummary),
        date: eventDate.toISOString().slice(0, 10),
        daysUntil,
        bucket,
        linked: false,
      })
    }

    events.sort((a, b) => a.daysUntil - b.daysUntil)

    return NextResponse.json(events)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Estimate numbering: YYMMDDGCCC###
// e.g. 260228RICH002 = Feb 28 2026, 2nd estimate for Richardson (code: RICH)
// GC codes are auto-generated from the GC name — JP never sets them manually.

import { supabase } from './supabase'

// Words to skip when building a code from multi-word names
const SKIP_WORDS = new Set(['the', 'and', 'of', 'a', 'an', 'in', 'at', 'to', 'for', 'by', 'with', 'from', 'de', 'el', 'la', 'les', 'le'])

/**
 * Derive the GC name from a project_name string.
 * Pattern: "Project Description - GC Name"  (last dash segment, trimmed)
 * Returns null if no dash found.
 */
export function deriveGcNameFromProject(projectName: string): string | null {
  const parts = projectName.split('-')
  if (parts.length < 2) return null
  const gcPart = parts[parts.length - 1].trim()
  if (!gcPart || gcPart.length < 2) return null
  return gcPart
}

/**
 * Generate a 4-char uppercase code from a GC name.
 * - Skip common filler words
 * - Take leading letters from meaningful words
 * - Pad with 'X' if shorter than 4 chars
 * Examples:
 *   "Richardson International" → RICH
 *   "PCL Constructors"        → PCLC
 *   "Ventana Construction"    → VENT
 *   "Omicron AEC"             → OMIC
 *   "VPac"                    → VPAC
 *   "SAH"                     → SAHX
 */
export function codeFromName(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-_&/]+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()))

  const raw = words.join('').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return raw.slice(0, 4).padEnd(4, 'X')
}

/**
 * Resolve the final unique code for a GC name.
 * Checks the DB for collisions; if the base code is taken by a DIFFERENT GC,
 * tries base[0..2] + '2', '3', … up to '9'.
 * Returns { code, isNew, existingId } — existingId is set if the GC is already registered.
 */
async function resolveCode(gcName: string): Promise<{ code: string; existingId: string | null }> {
  const normalizedName = gcName.trim()
  const baseCode = codeFromName(normalizedName)

  // Fetch all existing codes
  const { data: existing } = await supabase.from('gc_clients').select('id,name,code')
  const rows = existing ?? []

  // Check if a record with this name already exists (case-insensitive)
  const byName = rows.find(r => r.name.toLowerCase() === normalizedName.toLowerCase())
  if (byName) return { code: byName.code, existingId: byName.id }

  // Check base code collision
  const existingCodes = new Set(rows.map((r: any) => r.code))
  if (!existingCodes.has(baseCode)) return { code: baseCode, existingId: null }

  // Collision — try suffix 2–9
  for (let i = 2; i <= 9; i++) {
    const candidate = baseCode.slice(0, 3) + String(i)
    if (!existingCodes.has(candidate)) return { code: candidate, existingId: null }
  }

  // Extreme fallback: base + timestamp digit
  const fallback = baseCode.slice(0, 3) + String(Date.now()).slice(-1)
  return { code: fallback, existingId: null }
}

/**
 * Ensure a gc_clients record exists for the given GC name.
 * Creates it if needed. Returns the record.
 */
export async function getOrCreateGcClient(gcName: string): Promise<{ id: string; name: string; code: string; estimate_count: number }> {
  const normalizedName = gcName.trim()
  const { code, existingId } = await resolveCode(normalizedName)

  if (existingId) {
    const { data } = await supabase.from('gc_clients').select('*').eq('id', existingId).single()
    return data!
  }

  // Create new record
  const id = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Handle id collision (same slugified name)
  const { data: existing } = await supabase.from('gc_clients').select('id').eq('id', id).single()
  const finalId = existing ? `${id}-${code.toLowerCase()}` : id

  const { data, error } = await supabase
    .from('gc_clients')
    .insert({ id: finalId, name: normalizedName, code, estimate_count: 0 })
    .select()
    .single()

  if (error) throw new Error(`Failed to create gc_client for "${normalizedName}": ${error.message}`)
  return data!
}

/**
 * Generate a formatted estimate number for the given GC name.
 * Atomically increments the estimate_count for that GC.
 * Format: YYMMDDGCCC### e.g. 260228RICH002
 */
export async function generateEstimateNumber(gcName: string): Promise<{ estimateNumber: string; gcCode: string; gcName: string }> {
  const normalizedName = gcName.trim()
  const gc = await getOrCreateGcClient(normalizedName)

  // Increment count
  const newCount = (gc.estimate_count ?? 0) + 1
  const { error } = await supabase
    .from('gc_clients')
    .update({ estimate_count: newCount })
    .eq('id', gc.id)

  if (error) throw new Error(`Failed to increment estimate_count: ${error.message}`)

  const now = new Date()
  const yy = String(now.getUTCFullYear()).slice(2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const seq = String(newCount).padStart(3, '0')

  return {
    estimateNumber: `${yy}${mm}${dd}${gc.code}${seq}`,
    gcCode: gc.code,
    gcName: normalizedName,
  }
}

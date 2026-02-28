/**
 * Seed gc_clients table from existing bids.
 * Parses GC name from project_name using the "Project - GC Name" pattern.
 * Run: npx ts-node -r tsconfig-paths/register scripts/seed-gc-clients.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { codeFromName } from '../lib/estimates'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SKIP_WORDS = new Set(['the', 'and', 'of', 'a', 'an', 'in', 'at', 'to', 'for', 'by', 'with', 'from'])

function deriveGcName(projectName: string): string | null {
  const parts = projectName.split('-')
  if (parts.length < 2) return null
  const gcPart = parts[parts.length - 1].trim()
  if (!gcPart || gcPart.length < 2) return null
  // Reject pure numbers or very generic segments
  if (/^\d+$/.test(gcPart)) return null
  return gcPart
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  const { data: bids, error } = await supabase.from('bids').select('project_name')
  if (error) throw error

  // Collect unique GC names
  const gcMap = new Map<string, string>() // normalized name → code

  for (const bid of bids ?? []) {
    const gcName = deriveGcName(bid.project_name || '')
    if (!gcName) continue
    const normalized = gcName.trim()
    const code = codeFromName(normalized)
    const key = normalized.toLowerCase()
    if (!gcMap.has(key)) gcMap.set(key, code)
  }

  console.log(`Found ${gcMap.size} unique GC names to seed`)

  // Resolve collisions and upsert
  const usedCodes = new Set<string>()

  // First fetch existing codes
  const { data: existing } = await supabase.from('gc_clients').select('code,name')
  for (const row of existing ?? []) usedCodes.add(row.code)

  for (const [key, baseCode] of gcMap) {
    const originalName = [...gcMap.keys()].includes(key)
      ? (bids ?? []).find(b => {
          const n = deriveGcName(b.project_name || '')
          return n && n.trim().toLowerCase() === key
        })?.project_name?.split('-').pop()?.trim() ?? key
      : key

    // Check if already exists by name
    const existingByName = (existing ?? []).find(r => r.name.toLowerCase() === key)
    if (existingByName) {
      console.log(`  ✓ Already exists: ${existingByName.name} → ${existingByName.code}`)
      continue
    }

    // Resolve collision
    let code = baseCode
    if (usedCodes.has(code)) {
      for (let i = 2; i <= 9; i++) {
        const candidate = code.slice(0, 3) + String(i)
        if (!usedCodes.has(candidate)) { code = candidate; break }
      }
    }
    usedCodes.add(code)

    const gcName = originalName
    const id = slugify(gcName)

    const { error: insertError } = await supabase.from('gc_clients').upsert(
      { id, name: gcName, code, estimate_count: 0 },
      { onConflict: 'code', ignoreDuplicates: true }
    )

    if (insertError) {
      // Try with a modified id
      const { error: e2 } = await supabase.from('gc_clients').upsert(
        { id: `${id}-${code.toLowerCase()}`, name: gcName, code, estimate_count: 0 },
        { onConflict: 'code', ignoreDuplicates: true }
      )
      if (e2) console.error(`  ✗ Failed to insert ${gcName}: ${e2.message}`)
      else console.log(`  + Seeded: ${gcName} → ${code}`)
    } else {
      console.log(`  + Seeded: ${gcName} → ${code}`)
    }
  }

  console.log('Seeding complete.')
}

main().catch(console.error)

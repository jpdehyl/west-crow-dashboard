export type BidStatus = 'active' | 'sent' | 'won' | 'lost' | 'no-bid'
export type BidStage  = 'invited' | 'estimating' | 'submitted' | 'decision'

export interface TimelineEvent {
  stage: BidStage
  date: string
  note?: string
  by?: string
}

export interface Bid {
  id: string
  project_name: string
  client: string
  client_id: string
  bid_value: number
  deadline: string
  status: BidStatus
  margin_pct: number | null
  estimator: string
  notes: string
  created_at: string
  dropbox_folder?: string
  timeline: TimelineEvent[]
  documents?: { name: string; url: string; type: 'bid_docs' | 'drawings' | 'hazmat' | 'quote_sheet' | 'addendum' }[]
}

export interface DailyLog {
  id: string
  date: string
  crew: string[]
  hours: number
  work_performed: string
  notes?: string
  weather?: string
  issues?: string
  photos?: number
}

export interface Invoice {
  id: string
  number: string
  type: 'progress' | 'final'
  gross_amount: number
  holdback_pct: number
  sent_date?: string
  paid_date?: string
  holdback_release_date?: string
  notes?: string
}

export interface Cost {
  id: string
  date: string
  description: string
  amount: number
  category: 'labour' | 'materials' | 'equipment' | 'subcontractor' | 'other'
  vendor?: string
}

export interface Project {
  id: string
  bid_id: string
  project_name: string
  client: string
  client_id: string
  contract_value: number
  start_date: string
  end_date: string
  status: 'active' | 'complete' | 'on-hold'
  estimator: string
  superintendent?: string
  po_number?: string
  contract_signed_date?: string
  budget_labour: number
  budget_materials: number
  budget_equipment: number
  budget_subs: number
  daily_logs: DailyLog[]
  costs: Cost[]
  estimate_total: number
  invoices?: Invoice[]
  close_notes?: string
}

export interface Client {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  type: 'commercial' | 'residential' | 'industrial'
}

// ─── SEED DATA (real West Crow clients + bids from Dropbox) ──────────────────

export const CLIENTS: Client[] = [
  { id: 'c1',  name: 'TD Bank',                      contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c2',  name: 'RBC',                           contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c3',  name: 'Scotiabank',                    contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c4',  name: 'Vancouver Community College',   contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c5',  name: 'UBC',                           contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c6',  name: 'Vancouver Coastal Health',      contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c7',  name: 'Lululemon',                     contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c8',  name: 'Teck Resources',                contact_name: '', email: '', phone: '', type: 'industrial' },
  { id: 'c9',  name: "McDonald's Canada",             contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c10', name: 'City of Burnaby',               contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c11', name: 'Armstrong Simpson',             contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c12', name: 'CFIA (Federal Government)',     contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c13', name: 'Richardson International',      contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c14', name: 'KPU',                           contact_name: '', email: '', phone: '', type: 'commercial' },
  { id: 'c15', name: 'District of North Vancouver',   contact_name: '', email: '', phone: '', type: 'commercial' },
]

export const BIDS: Bid[] = [
  // ── Active pipeline ──
  {
    id: 'b1', project_name: 'VCC W Pender Washroom Renovation',
    client: 'Vancouver Community College', client_id: 'c4',
    bid_value: 0, deadline: '2026-03-18', status: 'active', margin_pct: null,
    estimator: 'JP', notes: 'Washroom renovation scope. Drawings + hazmat report in Dropbox.',
    dropbox_folder: 'VCC W Pender Washroom Renovation',
    created_at: '2026-02-20T09:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-20', by: 'Ean', note: 'Bid invite received — VCC facilities' },
      { stage: 'estimating', date: '2026-02-24', by: 'JP',  note: 'Takeoff started, drawings reviewed' },
    ],
  },
  {
    id: 'b2', project_name: 'Lululemon TI 1380 Burrard St 5th Floor',
    client: 'Lululemon', client_id: 'c7',
    bid_value: 0, deadline: '2026-03-14', status: 'active', margin_pct: null,
    estimator: 'JP', notes: 'TI scope, 5th floor office. Drawings in Dropbox.',
    dropbox_folder: 'Lululemon TI 1380 Burrard St 5th floor Project',
    created_at: '2026-02-18T10:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-18', by: 'Ean', note: 'Bid invite received' },
      { stage: 'estimating', date: '2026-02-22', by: 'JP',  note: 'Drawings downloaded, estimate in progress' },
    ],
  },
  {
    id: 'b3', project_name: 'TD West Hastings Branch Refresh',
    client: 'TD Bank', client_id: 'c1',
    bid_value: 0, deadline: '2026-03-21', status: 'active', margin_pct: null,
    estimator: 'JP', notes: 'Branch TI refresh. Standard WCC TD scope.',
    dropbox_folder: 'TD West Hastings',
    created_at: '2026-02-22T08:00:00Z',
    timeline: [
      { stage: 'invited', date: '2026-02-22', by: 'Ean', note: 'TD Bank bid invite received' },
    ],
  },
  {
    id: 'b4', project_name: 'RBC DS Thurlow 19th & 20th Floor Reconfiguration',
    client: 'RBC', client_id: 'c2',
    bid_value: 0, deadline: '2026-03-28', status: 'active', margin_pct: null,
    estimator: 'JP', notes: 'Multi-floor office TI. Large scope — 2 floors.',
    dropbox_folder: 'RBC DS Thurlow 19th and 20th Floor Reconfiguration',
    created_at: '2026-02-24T09:00:00Z',
    timeline: [
      { stage: 'invited', date: '2026-02-24', by: 'Ean', note: 'Bid invite — 2-floor TI, priority scope' },
    ],
  },
  {
    id: 'b5', project_name: 'Teck Resources Level 34 & 35 — Phase 2 & 3',
    client: 'Teck Resources', client_id: 'c8',
    bid_value: 0, deadline: '2026-03-25', status: 'active', margin_pct: null,
    estimator: 'JP', notes: 'Multi-phase high-rise TI. Phase 2 & 3 of ongoing project.',
    dropbox_folder: 'Teck Resources Level 34 &35 - Phase 2 and 3',
    created_at: '2026-02-25T11:00:00Z',
    timeline: [
      { stage: 'invited', date: '2026-02-25', by: 'Ean', note: 'Phase 2 & 3 invite from Teck PM' },
    ],
  },
  {
    id: 'b6', project_name: 'Armstrong Simpson 830 West Broadway',
    client: 'Armstrong Simpson', client_id: 'c11',
    bid_value: 0, deadline: '2026-04-02', status: 'active', margin_pct: null,
    estimator: 'JP', notes: 'Office TI tender. Drawings received.',
    dropbox_folder: 'Armstrong Simpson tender - 830 999 West Broadway',
    created_at: '2026-02-26T08:00:00Z',
    timeline: [
      { stage: 'invited', date: '2026-02-26', by: 'Ean', note: 'Tender received from Armstrong Simpson' },
    ],
  },
  // ── Sent ──
  {
    id: 'b7', project_name: 'Scotiabank Park Royal Branch Reno',
    client: 'Scotiabank', client_id: 'c3',
    bid_value: 28500, deadline: '2026-02-28', status: 'sent', margin_pct: null,
    estimator: 'JP', notes: 'Bank branch TI. Standard finishes + partitions. Bid sent.',
    dropbox_folder: 'Scotiabank Park Royal',
    created_at: '2026-02-10T09:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-10', by: 'Ean',       note: 'Bid invite received' },
      { stage: 'estimating', date: '2026-02-12', by: 'Francisco', note: 'Takeoff complete' },
      { stage: 'submitted',  date: '2026-02-19', by: 'Francisco', note: 'Bid submitted $28,500' },
    ],
  },
  {
    id: 'b8', project_name: 'TD Norgate North Vancouver Reno',
    client: 'TD Bank', client_id: 'c1',
    bid_value: 22000, deadline: '2026-02-25', status: 'sent', margin_pct: null,
    estimator: 'JP', notes: 'Small branch refresh. Flooring + partitions.',
    dropbox_folder: 'TD Norgate North Vancouver Reno',
    created_at: '2026-02-08T10:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-08', by: 'Ean',       note: 'TD Norgate bid invite' },
      { stage: 'estimating', date: '2026-02-10', by: 'Francisco', note: 'Small scope, quick takeoff' },
      { stage: 'submitted',  date: '2026-02-16', by: 'Francisco', note: 'Bid submitted $22,000' },
    ],
  },
  // ── Won (real values confirmed) ──
  {
    id: 'b9', project_name: 'Gender Neutral Washroom Refit — CFIA',
    client: 'CFIA (Federal Government)', client_id: 'c12',
    bid_value: 4716, deadline: '2025-09-15', status: 'won', margin_pct: 11,
    estimator: 'Francisco', notes: 'Single washroom refit. Lead tile confirmed. 1 crew-day.',
    dropbox_folder: 'Gender Neutral Accessible Washroom Refit for CFIA',
    created_at: '2025-09-01T09:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2025-09-01', by: 'Ean',       note: 'CFIA washroom bid invite received' },
      { stage: 'estimating', date: '2025-09-05', by: 'Francisco', note: 'Hazmat report confirmed lead tile' },
      { stage: 'submitted',  date: '2025-09-08', by: 'Francisco', note: 'Bid submitted $4,716' },
      { stage: 'decision',   date: '2025-09-12', by: 'Dave',      note: 'WON — awarded' },
    ],
  },
  {
    id: 'b10', project_name: 'Richardson International North Vancouver',
    client: 'Richardson International', client_id: 'c13',
    bid_value: 2511, deadline: '2023-08-20', status: 'won', margin_pct: 11,
    estimator: 'Francisco', notes: 'Lead tile abatement — washroom floor + walls. 260 SF. 1 crew-day.',
    dropbox_folder: 'Richardson International North Vancouver',
    created_at: '2023-08-10T09:00:00Z',
    timeline: [
      { stage: 'invited',   date: '2023-08-10', by: 'Ean',       note: 'Bid invite received' },
      { stage: 'submitted', date: '2023-08-15', by: 'Francisco', note: 'Bid submitted $2,511' },
      { stage: 'decision',  date: '2023-08-20', by: 'Dave',      note: 'WON — awarded' },
    ],
  },
  {
    id: 'b11', project_name: 'UBC Henry Angus Building Renovation',
    client: 'UBC', client_id: 'c5',
    bid_value: 47200, deadline: '2024-10-15', status: 'won', margin_pct: 18,
    estimator: 'Francisco', notes: 'Multi-room TI. Partitions, T-bar, flooring, washrooms. Government multiplier applied.',
    dropbox_folder: '24-63 UBC - Henry Angus Renovation - 2053 Main Mal',
    created_at: '2024-09-30T09:00:00Z',
    timeline: [
      { stage: 'invited',   date: '2024-09-30', by: 'Ean',       note: 'UBC bid invite received' },
      { stage: 'submitted', date: '2024-10-10', by: 'Francisco', note: 'Bid submitted $47,200' },
      { stage: 'decision',  date: '2024-10-15', by: 'Dave',      note: 'WON — lowest compliant bid' },
    ],
  },
  {
    id: 'b12', project_name: 'City of Burnaby Montague Moore Exterior Rehab',
    client: 'City of Burnaby', client_id: 'c10',
    bid_value: 89400, deadline: '2024-11-20', status: 'won', margin_pct: 20,
    estimator: 'Francisco', notes: 'Exterior envelope rehab + interior demo. Large multi-scope.',
    dropbox_folder: '24-72 City of Burnaby Montague Moore Exterior Envelope Rehab - 5165 Sperling Ave',
    created_at: '2024-11-01T09:00:00Z',
    timeline: [
      { stage: 'invited',   date: '2024-11-01', by: 'Ean',       note: 'City of Burnaby RFP received' },
      { stage: 'submitted', date: '2024-11-15', by: 'Francisco', note: 'Bid submitted $89,400' },
      { stage: 'decision',  date: '2024-11-20', by: 'Dave',      note: 'WON — awarded' },
    ],
  },
  // ── Lost ──
  {
    id: 'b13', project_name: 'VCH UBCH Koerner Radiology Rooms 2 & 3',
    client: 'Vancouver Coastal Health', client_id: 'c6',
    bid_value: 63000, deadline: '2025-06-10', status: 'lost', margin_pct: null,
    estimator: 'Francisco', notes: 'Hospital environment — 50% labour premium applied. Outbid on final price.',
    dropbox_folder: 'VCH UBCH Koerner Radiology Room 2 & 3 Renovation - 2211 Wesbrook Mall',
    created_at: '2025-05-25T09:00:00Z',
    timeline: [
      { stage: 'invited',   date: '2025-05-25', by: 'Ean',       note: 'VCH Koerner hospital bid invite' },
      { stage: 'submitted', date: '2025-06-05', by: 'Francisco', note: 'Bid submitted $63,000' },
      { stage: 'decision',  date: '2025-06-10', by: 'Dave',      note: 'LOST — outbid' },
    ],
  },
  // ── No bid ──
  {
    id: 'b14', project_name: 'Richmond Centre TI Renovation',
    client: 'Lululemon', client_id: 'c7',
    bid_value: 0, deadline: '2026-02-14', status: 'no-bid', margin_pct: null,
    estimator: 'JP', notes: 'Scope too large for current capacity. Passed.',
    dropbox_folder: 'Richmond Centre',
    created_at: '2026-02-05T09:00:00Z',
    timeline: [
      { stage: 'invited',  date: '2026-02-05', by: 'Ean', note: 'Richmond Centre invite received' },
      { stage: 'decision', date: '2026-02-07', by: 'JP',  note: 'NO BID — capacity constraints' },
    ],
  },
]

// Projects populate as JP wins bids and POs are issued (starting March 2026).
export const PROJECTS: Project[] = []

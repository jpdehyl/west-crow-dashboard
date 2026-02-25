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
  budget_labour: number
  budget_materials: number
  budget_subs: number
  daily_logs: DailyLog[]
  costs: Cost[]
  estimate_total: number
}

export interface Client {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  type: 'commercial' | 'residential' | 'industrial'
}

// ─── SEED DATA ─────────────────────────────────────────────────────────────

export const CLIENTS: Client[] = [
  { id: 'c1', name: 'Pacific Properties Ltd.',   contact_name: 'Mark Holloway',  email: 'mark@pacificprop.ca',       phone: '604-555-0101', type: 'commercial' },
  { id: 'c2', name: 'Westside Developments',      contact_name: 'Sandra Lee',     email: 'sandra@westsidedev.ca',     phone: '604-555-0142', type: 'commercial' },
  { id: 'c3', name: 'Harbour Industrial Group',   contact_name: 'Tom Richter',    email: 'trichter@harbourind.ca',    phone: '604-555-0188', type: 'industrial' },
  { id: 'c4', name: 'Starlight Hotel Group',      contact_name: 'Angela Park',    email: 'apark@starlighthg.com',     phone: '604-555-0199', type: 'commercial' },
  { id: 'c5', name: 'Apex Construction',          contact_name: 'Derek Simms',    email: 'derek@apexconstruction.ca', phone: '604-555-0131', type: 'commercial' },
  { id: 'c6', name: 'Street Level Contracting',   contact_name: 'Ryan Hooper',    email: 'ryan@streetlevel.ca',       phone: '604-555-0177', type: 'commercial' },
  { id: 'c7', name: 'Metro Vancouver Schools',    contact_name: 'Diane Patel',    email: 'dpatel@vsb.bc.ca',          phone: '604-555-0214', type: 'commercial' },
]

export const BIDS: Bid[] = [
  {
    id: 'b1',
    project_name: 'Burnaby Office Demolition',
    client: 'Pacific Properties Ltd.',
    client_id: 'c1',
    bid_value: 148000,
    deadline: '2026-03-05',
    status: 'active',
    margin_pct: null,
    estimator: 'JP',
    notes: 'Full interior demo, 4 floors. HAZMAT assessment required. Client wants 24/7 operations considered.',
    created_at: '2026-02-20T10:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-20', by: 'Ean',  note: 'Bid invite received via email' },
      { stage: 'estimating', date: '2026-02-22', by: 'JP',   note: 'Started takeoff — drawings uploaded' },
    ],
    documents: [
      { name: 'Architectural Drawings', url: 'https://buildertrend.net', type: 'drawings' },
      { name: 'Hazmat Report', url: 'https://buildertrend.net', type: 'hazmat' },
    ],
  },
  {
    id: 'b2',
    project_name: 'Coquitlam Retail Reno',
    client: 'Westside Developments',
    client_id: 'c2',
    bid_value: 62500,
    deadline: '2026-03-10',
    status: 'sent',
    margin_pct: null,
    estimator: 'JP',
    notes: 'Selective demo, storefront strip-out. Quick turnaround expected.',
    created_at: '2026-02-18T09:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-18', by: 'Ean', note: 'Bid invite received' },
      { stage: 'estimating', date: '2026-02-19', by: 'JP',  note: 'Estimate completed' },
      { stage: 'submitted',  date: '2026-02-21', by: 'JP',  note: 'Bid submitted $62,500' },
    ],
  },
  {
    id: 'b3',
    project_name: 'North Van Warehouse Clear',
    client: 'Harbour Industrial Group',
    client_id: 'c3',
    bid_value: 215000,
    deadline: '2026-02-28',
    status: 'won',
    margin_pct: 34,
    estimator: 'JP',
    notes: 'Full clear & abatement. PO received. Crew mobilizing March 3.',
    created_at: '2026-02-10T08:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-10', by: 'Ean', note: 'Bid invite received' },
      { stage: 'estimating', date: '2026-02-12', by: 'JP',  note: 'Clark estimate drafted, approved by JP' },
      { stage: 'submitted',  date: '2026-02-14', by: 'JP',  note: 'Bid submitted $215,000' },
      { stage: 'decision',   date: '2026-02-22', by: 'JP',  note: 'WON — PO received' },
    ],
    documents: [
      { name: 'Signed Contract', url: 'https://buildertrend.net', type: 'bid_docs' },
    ],
  },
  {
    id: 'b4',
    project_name: 'Richmond Hotel Fit-Out',
    client: 'Starlight Hotel Group',
    client_id: 'c4',
    bid_value: 390000,
    deadline: '2026-03-15',
    status: 'active',
    margin_pct: null,
    estimator: 'JP',
    notes: '180 room demo. Tight schedule, 24/7 ops. Review subcontractor pricing before submitting.',
    created_at: '2026-02-22T11:30:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-22', by: 'Ean', note: 'Bid invite received — large job, flagged as priority' },
      { stage: 'estimating', date: '2026-02-24', by: 'JP',  note: 'Clark working on estimate' },
    ],
  },
  {
    id: 'b5',
    project_name: 'Surrey Mixed-Use Phase 2',
    client: 'Apex Construction',
    client_id: 'c5',
    bid_value: 88000,
    deadline: '2026-03-20',
    status: 'no-bid',
    margin_pct: null,
    estimator: 'JP',
    notes: 'Margin too tight at their target price. Passed.',
    created_at: '2026-02-15T14:00:00Z',
    timeline: [
      { stage: 'invited',  date: '2026-02-15', by: 'Ean', note: 'Bid invite received' },
      { stage: 'decision', date: '2026-02-17', by: 'JP',  note: 'NO BID — insufficient margin' },
    ],
  },
  {
    id: 'b6',
    project_name: '5575 Patterson Ave Demo',
    client: 'Street Level Contracting',
    client_id: 'c6',
    bid_value: 175000,
    deadline: '2026-03-08',
    status: 'sent',
    margin_pct: null,
    estimator: 'JP',
    notes: 'Full residential teardown, heritage property — asbestos likely. Waiting on hazmat report.',
    created_at: '2026-02-23T09:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-02-23', by: 'Ean', note: 'Bid invite received from Ryan Hooper' },
      { stage: 'estimating', date: '2026-02-24', by: 'JP',  note: 'Pending hazmat report' },
      { stage: 'submitted',  date: '2026-02-25', by: 'JP',  note: 'Bid submitted — conditional on hazmat confirmation' },
    ],
    documents: [
      { name: 'Bid Documents', url: 'https://buildertrend.net', type: 'bid_docs' },
      { name: 'Architectural Drawings', url: 'https://buildertrend.net', type: 'drawings' },
    ],
  },
  {
    id: 'b7',
    project_name: 'Burnaby Secondary Abatement',
    client: 'Metro Vancouver Schools',
    client_id: 'c7',
    bid_value: 195000,
    deadline: '2026-02-10',
    status: 'won',
    margin_pct: 29,
    estimator: 'JP',
    notes: 'Asbestos abatement — 3 floors, occupied building. Must coordinate with school calendar. PO issued.',
    created_at: '2026-01-28T09:00:00Z',
    timeline: [
      { stage: 'invited',    date: '2026-01-28', by: 'Ean', note: 'RFP received via VSB procurement portal' },
      { stage: 'estimating', date: '2026-01-30', by: 'JP',  note: 'Hazmat report reviewed, takeoff complete' },
      { stage: 'submitted',  date: '2026-02-05', by: 'JP',  note: 'Bid submitted $195,000' },
      { stage: 'decision',   date: '2026-02-14', by: 'JP',  note: 'WON — lowest compliant bid. PO issued.' },
    ],
    documents: [
      { name: 'Hazmat Report', url: 'https://buildertrend.net', type: 'hazmat' },
      { name: 'Signed Contract', url: 'https://buildertrend.net', type: 'bid_docs' },
    ],
  },
]

export const PROJECTS: Project[] = [
  {
    id: 'p2',
    bid_id: 'b7',
    project_name: 'Burnaby Secondary Abatement',
    client: 'Metro Vancouver Schools',
    client_id: 'c7',
    contract_value: 195000,
    start_date: '2026-02-17',
    end_date: '2026-03-14',
    status: 'active',
    estimator: 'JP',
    estimate_total: 195000,
    budget_labour: 110000,
    budget_materials: 18000,
    budget_subs: 28000,
    daily_logs: [
      { id: 'dl4', date: '2026-02-17', crew: ['Oscar', 'Crew x3'], hours: 32, work_performed: 'Site setup, decon unit installed. Access to Level 1 confirmed with school facilities.', weather: 'Clear' },
      { id: 'dl5', date: '2026-02-18', crew: ['Oscar', 'Crew x3'], hours: 32, work_performed: 'Floor tile removal Level 1 — 1,800 SF completed. Bulk waste staged at loading dock.', weather: 'Clear' },
      { id: 'dl6', date: '2026-02-19', crew: ['Oscar', 'Crew x3'], hours: 32, work_performed: 'Ceiling tiles Level 1 (900 SF). HEPA vacuuming ongoing. Air clearance test passed.', weather: 'Rain' },
      { id: 'dl7', date: '2026-02-20', crew: ['Oscar', 'Crew x4'], hours: 40, work_performed: 'Level 2 containment setup. VCT removal started — 900 SF complete, 900 SF remaining.', weather: 'Overcast' },
    ],
    costs: [
      { id: 'cost6', date: '2026-02-17', description: 'Oscar — 4 days', amount: 3360, category: 'labour', vendor: 'Oscar Morales' },
      { id: 'cost7', date: '2026-02-17', description: 'Crew × 3 — 4 days', amount: 9720, category: 'labour', vendor: '24/7 Workforce' },
      { id: 'cost8', date: '2026-02-19', description: 'Decon unit rental', amount: 2200, category: 'equipment', vendor: 'Sunbelt Rentals' },
      { id: 'cost9', date: '2026-02-20', description: 'Abatement bags + PPE', amount: 1800, category: 'materials', vendor: 'SafeGuard Supply' },
      { id: 'cost10', date: '2026-02-20', description: 'Air quality testing', amount: 1400, category: 'subcontractor', vendor: 'EcoTest Environmental' },
    ],
  },
  {
    id: 'p1',
    bid_id: 'b3',
    project_name: 'North Van Warehouse Clear',
    client: 'Harbour Industrial Group',
    client_id: 'c3',
    contract_value: 215000,
    start_date: '2026-03-03',
    end_date: '2026-03-28',
    status: 'active',
    estimator: 'JP',
    estimate_total: 215000,
    budget_labour: 130000,
    budget_materials: 25000,
    budget_subs: 35000,
    daily_logs: [
      { id: 'dl1', date: '2026-03-03', crew: ['Oscar', 'Crew x4'], hours: 40, work_performed: 'Site mobilization, decon unit setup, initial containment installation.', weather: 'Overcast' },
      { id: 'dl2', date: '2026-03-04', crew: ['Oscar', 'Crew x4'], hours: 40, work_performed: 'VCT removal Level 1 complete (2,500 SF). Waste staging ongoing.', weather: 'Clear' },
      { id: 'dl3', date: '2026-03-05', crew: ['Oscar', 'Crew x3'], hours: 32, work_performed: 'Ceiling tile removal Level 1 (1,200 SF). HEPA vacuuming in progress.', weather: 'Rain' },
    ],
    costs: [
      { id: 'cost1', date: '2026-03-03', description: 'Oscar — 3 days labour', amount: 2520,  category: 'labour',    vendor: 'Oscar Morales' },
      { id: 'cost2', date: '2026-03-03', description: 'Crew × 4 — 3 days',    amount: 10800, category: 'labour',    vendor: '24/7 Workforce' },
      { id: 'cost3', date: '2026-03-03', description: 'HEPA Vac rental',       amount: 1200,  category: 'equipment', vendor: 'Sunbelt Rentals' },
      { id: 'cost4', date: '2026-03-04', description: 'Abatement supplies',    amount: 3400,  category: 'materials', vendor: 'SafeGuard Supply' },
      { id: 'cost5', date: '2026-03-05', description: 'Waste disposal — load 1', amount: 1850, category: 'subcontractor', vendor: 'CleanHaul BC' },
    ],
  },
]

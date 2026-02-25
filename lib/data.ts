export type BidStatus = 'active' | 'sent' | 'won' | 'lost' | 'no-bid'

export interface Bid {
  id: string
  project_name: string
  client: string
  bid_value: number
  deadline: string // ISO date string
  status: BidStatus
  margin_pct: number | null
  estimator: string
  notes: string
  created_at: string
}

export interface Client {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  type: 'commercial' | 'residential' | 'industrial'
}

// Seed data — replace with Google Sheets integration
export const BIDS: Bid[] = [
  {
    id: '1',
    project_name: 'Burnaby Office Demolition',
    client: 'Pacific Properties Ltd.',
    bid_value: 148000,
    deadline: '2026-03-05',
    status: 'active',
    margin_pct: null,
    estimator: 'JP',
    notes: 'Full interior demo, 4 floors. HAZMAT assessment required.',
    created_at: '2026-02-20T10:00:00Z',
  },
  {
    id: '2',
    project_name: 'Coquitlam Retail Reno',
    client: 'Westside Developments',
    bid_value: 62500,
    deadline: '2026-03-10',
    status: 'sent',
    margin_pct: null,
    estimator: 'JP',
    notes: 'Selective demo, storefront strip-out. Quick turnaround expected.',
    created_at: '2026-02-18T09:00:00Z',
  },
  {
    id: '3',
    project_name: 'North Van Warehouse Clear',
    client: 'Harbour Industrial Group',
    bid_value: 215000,
    deadline: '2026-02-28',
    status: 'won',
    margin_pct: 34,
    estimator: 'JP',
    notes: 'Full clear & abatement. PO received.',
    created_at: '2026-02-10T08:00:00Z',
  },
  {
    id: '4',
    project_name: 'Richmond Hotel Fit-Out',
    client: 'Starlight Hotel Group',
    bid_value: 390000,
    deadline: '2026-03-15',
    status: 'active',
    margin_pct: null,
    estimator: 'JP',
    notes: '180 room demo. Tight schedule, 24/7 ops. Review subcontractor pricing.',
    created_at: '2026-02-22T11:30:00Z',
  },
  {
    id: '5',
    project_name: 'Surrey Mixed-Use Phase 2',
    client: 'Apex Construction',
    bid_value: 88000,
    deadline: '2026-03-20',
    status: 'no-bid',
    margin_pct: null,
    estimator: 'JP',
    notes: 'Too tight on margin. Passed.',
    created_at: '2026-02-15T14:00:00Z',
  },
]

export const CLIENTS: Client[] = [
  { id: '1', name: 'Pacific Properties Ltd.', contact_name: 'Mark Holloway', email: 'mark@pacificprop.ca', phone: '604-555-0101', type: 'commercial' },
  { id: '2', name: 'Westside Developments', contact_name: 'Sandra Lee', email: 'sandra@westsidedev.ca', phone: '604-555-0142', type: 'commercial' },
  { id: '3', name: 'Harbour Industrial Group', contact_name: 'Tom Richter', email: 'trichter@harbourind.ca', phone: '604-555-0188', type: 'industrial' },
  { id: '4', name: 'Starlight Hotel Group', contact_name: 'Angela Park', email: 'apark@starlighthg.com', phone: '604-555-0199', type: 'commercial' },
  { id: '5', name: 'Apex Construction', contact_name: 'Derek Simms', email: 'derek@apexconstruction.ca', phone: '604-555-0131', type: 'commercial' },
]

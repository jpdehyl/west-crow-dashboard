# West Crow Dashboard

A construction bid pipeline and project management dashboard for West Crow Contracting, branded to match westcrow.ca.

## Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + CSS custom properties (inline styles)
- **Font**: DM Sans (Google Fonts) — sans-serif only
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React + emoji icons in sidebar

## Project Structure

```
app/              # Next.js App Router pages
  layout.tsx      # Root layout with Sidebar
  page.tsx        # Dashboard home
  globals.css     # CSS variables, responsive grid classes
  bids/           # Bid pipeline (list + board views)
  projects/       # Active projects
  clients/        # Client list
  settings/       # Settings (UI scaffold, no backend auth)
  api/            # API routes (bids, clients, projects, costs, logs, invoices)
components/       # Shared React components
  ui/             # shadcn/ui base components
  Sidebar.tsx     # Dark collapsible nav sidebar with user avatar footer
  Logo.tsx        # West Crow logo (full + icon variants)
  BidActions.tsx  # Bid status update actions
  CostForm.tsx    # Cost entry form
  InvoiceActions.tsx
  LogForm.tsx
  StatusDot.tsx
lib/
  data.ts         # TypeScript types + seed data
  sheets.ts       # Google Sheets API client (optional)
  utils.ts        # Utility functions + STATUS_COLOR map
scripts/
  sheets-api.gs   # Google Apps Script for backend
```

## Dashboard Layout

Apple-inspired information-dense dashboard:
- **KPI cards**: 4-card responsive grid (Pipeline with mini bar chart, Active Bids, Awaiting, Win Rate with SVG arc)
- **Content grid**: Two-column layout — On Site projects (left ~60%) + Due Soon bids (right ~40%)
- **Activity feed**: Recent timeline events (bid stage changes, invoices sent) — no duplicate data
- **Responsive**: `.kpi-grid` 4→2→1 columns, `.content-grid` 2→1 columns (breakpoints at 1024px, 640px)
- No hero banner — compact date header with inline + New Bid button
- Full-width pages, no max-width constraints

## Sidebar

- Dark charcoal sidebar, collapsible via toggle button
- Logo at top navigates to dashboard
- Nav: Pipeline, Projects, Clients (no Settings in nav)
- User avatar footer ("JW / Jordan West" → /settings), OAuth-ready placeholder
- "+ New Bid" button above avatar section
- Collapse state persisted in localStorage

## Typography

- All pages use DM Sans (sans-serif) — no serif fonts
- Numbers/values: fontWeight 600, negative letter-spacing
- Labels: 11px uppercase, fontWeight 500, color --ink-faint
- Section headers: 11px uppercase, fontWeight 600, letter-spacing 0.08em
- Body text: 13-14px, fontWeight 500-600

## Branding

Color palette aligned with westcrow.ca:
- `--accent`: #2d2d2d (charcoal — primary brand)
- `--sidebar-bg`: #1a1a1a (dark sidebar)
- `--bg`: #ffffff (clean white), `--bg-subtle`: #f5f5f4 (cool grey)
- Functional colors: `--sage` (green/active), `--gold` (pending), `--terra` (warnings only)

## Data

Static seed data in `lib/data.ts`. Optionally connects to Google Sheets backend — set `SHEETS_API_URL` env var to enable. Falls back to seed data.

## Dev Setup

- Port 5000 via `npm run dev -p 5000 -H 0.0.0.0`
- `allowedDevOrigins: ["*"]` in `next.config.ts` for Replit proxy
- Layout padding: 1.5rem 2rem

## Deployment

- Target: autoscale
- Build: `npm run build`
- Run: `npm run start`

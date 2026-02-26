# West Crow Dashboard

A construction bid pipeline and project management dashboard for West Crow Contracting, branded to match westcrow.ca.

## Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components + CSS custom properties
- **Fonts**: DM Sans + DM Serif Display (Google Fonts)
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React + emoji icons in sidebar

## Project Structure

```
app/              # Next.js App Router pages
  layout.tsx      # Root layout with Sidebar
  page.tsx        # Dashboard home
  bids/           # Bid pipeline (list + board views)
  projects/       # Active projects
  clients/        # Client list
  settings/       # Settings (company, team, security, integrations)
  api/            # API routes (bids, clients, projects, costs, logs, invoices)
components/       # Shared React components
  ui/             # shadcn/ui base components
  Sidebar.tsx     # Dark collapsible nav sidebar
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
- **KPI cards**: 4-card responsive grid (Pipeline with mini bar, Active Bids, Awaiting, Win Rate with arc chart)
- **Content grid**: Two-column layout — On Site projects (left 60%) + Due Soon bids (right 40%)
- **Activity feed**: Recent timeline events replacing redundant "Recent Bids" section
- **Responsive**: 4→2→1 columns for KPIs, 2→1 for content grid (breakpoints at 1024px, 640px)
- No hero banner — compact date header with inline + New Bid button

## Branding

Color palette aligned with westcrow.ca:
- `--accent`: #2d2d2d (charcoal — primary brand)
- `--sidebar-bg`: #1a1a1a (dark sidebar)
- `--bg`: #ffffff (clean white), `--bg-subtle`: #f5f5f4 (cool grey)
- Functional colors: `--sage` (green/active), `--gold` (pending), `--terra` (warnings only)

## Sidebar

- Dark charcoal sidebar, collapsible via toggle button
- Logo at top navigates to dashboard (no separate Dashboard nav link)
- Nav: Pipeline, Projects, Clients, Settings
- Collapse state persisted in localStorage

## Data

Static seed data in `lib/data.ts`. Optionally connects to Google Sheets backend — set `SHEETS_API_URL` env var to enable. Falls back to seed data.

## Dev Setup

- Port 5000 via `npm run dev -p 5000 -H 0.0.0.0`
- `allowedDevOrigins: ["*"]` in `next.config.ts` for Replit proxy

## Deployment

- Target: autoscale
- Build: `npm run build`
- Run: `npm run start`

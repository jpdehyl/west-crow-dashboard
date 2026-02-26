# West Crow Dashboard

A construction bid pipeline and project management dashboard for West Crow Contracting.

## Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Fonts**: DM Sans + DM Serif Display (Google Fonts)
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Project Structure

```
app/              # Next.js App Router pages
  layout.tsx      # Root layout with Sidebar
  page.tsx        # Dashboard home
  bids/           # Bid pipeline
  projects/       # Active projects
  clients/        # Client list
components/       # Shared React components
  ui/             # shadcn/ui base components
  Sidebar.tsx     # Navigation sidebar
  BidActions.tsx  # Bid management actions
  CostForm.tsx    # Cost entry form
  InvoiceActions.tsx
  LogForm.tsx
  StatusDot.tsx
lib/
  data.ts         # TypeScript types + seed data
  sheets.ts       # Google Sheets API client (optional)
  utils.ts        # Utility functions
scripts/
  sheets-api.gs   # Google Apps Script for backend
```

## Data

Static seed data is in `lib/data.ts`. The app optionally connects to a Google Sheets backend via Google Apps Script — set `SHEETS_API_URL` environment variable to enable it. Without it, the app uses the seed data.

## Dev Setup

- Runs on port 5000 via `npm run dev`
- Host: `0.0.0.0` for Replit proxy compatibility
- `allowedDevOrigins: ["*"]` in `next.config.ts` for Replit iframe proxy

## Deployment

- Target: autoscale
- Build: `npm run build`
- Run: `npm run start`

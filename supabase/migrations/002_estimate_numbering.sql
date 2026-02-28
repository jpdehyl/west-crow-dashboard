-- Migration 002: Estimate numbering system + gc_clients table

-- Add columns to bids table
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS estimate_number TEXT,
  ADD COLUMN IF NOT EXISTS gc_code TEXT,
  ADD COLUMN IF NOT EXISTS gc_name TEXT,
  ADD COLUMN IF NOT EXISTS dropbox_linked BOOLEAN DEFAULT false;

-- Create gc_clients table
CREATE TABLE IF NOT EXISTS gc_clients (
  id TEXT PRIMARY KEY,             -- slugified gc name
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,       -- 4-char uppercase code
  estimate_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 003: persist generated Google estimate sheet URL on bids
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS estimate_sheet_url TEXT;

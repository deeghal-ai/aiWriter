-- Migration: Add share_token column for shareable links
-- Run this SQL in your Supabase SQL Editor

-- Add share_token column for generating shareable links
ALTER TABLE single_vehicle_research 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for fast lookups by share_token
CREATE INDEX IF NOT EXISTS idx_single_vehicle_research_share_token 
ON single_vehicle_research(share_token) 
WHERE share_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN single_vehicle_research.share_token IS 'Unique token for public sharing of generated content';

-- Migration: Create single_vehicle_research table
-- Run this SQL in your Supabase SQL Editor

-- Create the single_vehicle_research table
CREATE TABLE IF NOT EXISTS single_vehicle_research (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_name TEXT NOT NULL,
    display_name TEXT GENERATED ALWAYS AS (vehicle_name) STORED,
    research_sources TEXT[] DEFAULT '{}',
    current_step INTEGER DEFAULT 1,
    completed_steps INTEGER[] DEFAULT '{}',
    corpus JSONB,
    generated_content JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scraping', 'corpus_ready', 'generating', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_single_vehicle_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_single_vehicle_research_updated_at ON single_vehicle_research;
CREATE TRIGGER update_single_vehicle_research_updated_at
    BEFORE UPDATE ON single_vehicle_research
    FOR EACH ROW
    EXECUTE FUNCTION update_single_vehicle_research_updated_at();

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_single_vehicle_research_status ON single_vehicle_research(status);
CREATE INDEX IF NOT EXISTS idx_single_vehicle_research_updated_at ON single_vehicle_research(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_single_vehicle_research_vehicle_name ON single_vehicle_research(vehicle_name);

-- Enable Row Level Security (RLS) - adjust policies as needed
ALTER TABLE single_vehicle_research ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (adjust based on your auth setup)
-- For development/anonymous access:
CREATE POLICY "Allow all operations on single_vehicle_research" ON single_vehicle_research
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions (adjust based on your setup)
GRANT ALL ON single_vehicle_research TO anon;
GRANT ALL ON single_vehicle_research TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE single_vehicle_research IS 'Stores single vehicle research data including scraped corpus and generated content';

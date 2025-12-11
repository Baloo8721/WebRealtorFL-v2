-- ============================================================================
-- Supabase Schema Migration
-- Add missing columns for new form analytics fields
-- ============================================================================
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================================================

-- Add user_geo column for tracking where users submit forms from
-- This is auto-detected via timezone/IP (no permission needed)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_geo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN clients.user_geo IS 'Geographic location where user submitted the form (auto-detected via timezone/IP, no permission required)';

-- ============================================================================
-- Field Mapping Reference
-- ============================================================================
-- Form Field Name → Supabase Column Name
-- 
-- site_source → source_website (already exists)
-- preferred_language → preferred_language (already exists)
-- user_geo → user_geo (NEW - added above)
-- budget_btc → budget_btc (already exists)
-- monthly_payment → monthly_payment (already exists)
-- monthly_sats → monthly_sats (already exists)
-- currentLocation → current_city (already exists)
-- desiredLocation → desired_city (already exists)
-- clientType → client_types (already exists, array)
-- propertyType → property_types (already exists, array)
-- budget → budget_amount (already exists)
-- timeline → timeline (already exists, array)
-- specialty → agent_specialties (already exists, array)
-- preapproval → mortgage_preapproval (already exists, boolean)
-- preapprovalAmount → preapproval_amount (already exists)
-- notes → additional_notes (already exists)
-- referralSource → how_found (already exists, array)
-- ============================================================================

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clients' 
  AND column_name = 'user_geo';

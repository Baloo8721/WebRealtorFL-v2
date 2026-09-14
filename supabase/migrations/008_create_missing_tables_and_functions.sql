-- Migration: 008_create_missing_tables_and_functions
-- Author: Hermes Agent
-- Date: 2026-09-14
-- 
-- Creates missing tables: affiliate_clicks, referral_statuses, agent_statuses
-- Adds columns to referrals: email_log_id
-- Creates status change triggers and helper functions
-- Creates match_agents RPC with correct 1024-dim embedding support
-- Sets up RLS policies for new tables

-- ============================================
-- 1. CREATE ENUM TYPE
-- ============================================
CREATE TYPE IF NOT EXISTS referral_status_enum AS ENUM (
  'pending',
  'matched',
  'agent_notified',
  'agent_accepted',
  'client_signed',
  'closed',
  'expired'
);

-- ============================================
-- 2. CREATE affiliate_clicks TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,
  click_url TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  converted_at TIMESTAMPTZ,
  commission_btc NUMERIC DEFAULT 0
);

-- ============================================
-- 3. CREATE referral_statuses TABLE (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS referral_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
  from_status referral_status_enum,
  to_status referral_status_enum NOT NULL,
  changed_by UUID,
  changed_by_text TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- ============================================
-- 4. CREATE agent_statuses TABLE (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  from_status agent_status_enum,
  to_status agent_status_enum NOT NULL,
  changed_by UUID,
  changed_by_text TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE (referral_id, to_status, changed_at)
);

-- ============================================
-- 5. CREATE agent_reviews TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. CREATE site_config TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS site_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_name, config_key)
);

-- ============================================
-- 7. ADD missing columns to referrals
-- ============================================
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS notification_status TEXT DEFAULT 'pending';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS notifications JSONB;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS email_log_id UUID REFERENCES email_logs(id);

-- ============================================
-- 8. ADD missing columns to agents
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS scrape_status TEXT DEFAULT 'unknown';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS assigned_until TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 9. CREATE trigger function: referral status auto-audit
-- ============================================
CREATE OR REPLACE FUNCTION fn_referral_status_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO referral_statuses (
      referral_id,
      from_status,
      to_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.agent_id, -- use agent_id as trigger source reference
      now(),
      'Auto: ' || COALESCE(OLD.status::text, 'NEW') || ' → ' || NEW.status::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_status ON referrals;
CREATE TRIGGER trg_referral_status
  AFTER UPDATE ON referrals
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION fn_referral_status_audit();

-- ============================================
-- 10. CREATE trigger function: agent status auto-audit
-- ============================================
CREATE OR REPLACE FUNCTION fn_agent_status_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO agent_statuses (
      agent_id,
      from_status,
      to_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.agent_id,
      now(),
      'Auto: ' || COALESCE(OLD.status::text, 'NEW') || ' → ' || NEW.status::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_status ON agents;
CREATE TRIGGER trg_agent_status
  AFTER UPDATE ON agents
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION fn_agent_status_audit();

-- ============================================
-- 11. CREATE match_agents RPC with 1024-dim vector support
-- ============================================
CREATE OR REPLACE FUNCTION match_agents(
  p_city TEXT,
  p_count INTEGER,
  p_language TEXT,
  p_query_embedding VECTOR(1024),
  p_required_specialties TEXT[]
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  agent_phone TEXT,
  brokerage TEXT,
  license_number TEXT,
  years_experience INTEGER,
  specialties TEXT[],
  languages TEXT[],
  service_cities TEXT[],
  match_score NUMERIC,
  specialty_score NUMERIC,
  language_score NUMERIC,
  location_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS agent_id,
    a.name AS agent_name,
    a.email AS agent_email,
    a.phone AS agent_phone,
    a.brokerage,
    a.license_number,
    a.years_experience,
    a.specialties,
    a.languages,
    a.service_cities,
    (1 - (a.embedding <=> p_query_embedding))::NUMERIC AS match_score,
    GREATEST(
      array_position(a.specialties, 'Real Estate'),
      array_position(a.specialties, 'Property Management'),
      array_position(a.specialties, 'Investment Properties')
    ) AS specialty_score,
    CASE WHEN a.languages && ARRAY[p_language] THEN 1.0 ELSE 0.0 END AS language_score,
    CASE WHEN a.service_cities && array_replace(ARRAY[p_city], ' ', '') THEN 1.0 ELSE 0.0 END AS location_score
  FROM agents a
  WHERE a.is_active = true
  ORDER BY match_score DESC
  LIMIT COALESCE(p_count, 3);
END;
$$;

-- ============================================
-- 12. CREATE helper functions
-- ============================================
CREATE OR REPLACE FUNCTION fn_text_to_embedding(text_input TEXT)
RETURNS VECTOR(1024)
LANGUAGE plpgsql
AS $$
DECLARE
  embedding VECTOR(1024) := vector.zeros();
  words TEXT[];
  word TEXT;
  idx INTEGER;
  val FLOAT;
  norm FLOAT := 0;
BEGIN
  words := regexp_split_to_array(lower(text_input), '\s+');
  
  FOREACH word IN ARRAY words
  LOOP
    FOR i IN 1..length(word) LOOP
      idx := (ascii(substr(word, i, 1)) * i) % 1024;
      vec[idx] := vec[idx] + 0.01;
    END LOOP;
  END LOOP;
  
  FOR i IN 0..1023 LOOP
    norm := norm + (vec[i] ^ 2);
  END LOOP;
  norm := sqrt(norm);
  
  IF norm > 0 THEN
    FOR i IN 0..1023 LOOP
      vec[i] := vec[i] / norm;
    END LOOP;
  END IF;
  
  RETURN vec;
END;
$$;

-- ============================================
-- 13. CREATE RLS POLICIES FOR NEW TABLES
-- ============================================

-- affiliate_clicks
CREATE POLICY IF NOT EXISTS affiliate_clicks_insert ON affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS affiliate_clicks_read ON affiliate_clicks FOR SELECT USING (true);

-- referral_statuses
CREATE POLICY IF NOT EXISTS referral_statuses_read ON referral_statuses FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS referral_statuses_insert ON referral_statuses FOR INSERT WITH CHECK (true);

-- agent_statuses
CREATE POLICY IF NOT EXISTS agent_statuses_read ON agent_statuses FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS agent_statuses_insert ON agent_statuses FOR INSERT WITH CHECK (true);

-- agent_reviews
CREATE POLICY IF NOT EXISTS agent_reviews_read ON agent_reviews FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS agent_reviews_insert ON agent_reviews FOR INSERT WITH CHECK (true);

-- site_config
CREATE POLICY IF NOT EXISTS site_config_read ON site_config FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS site_config_write ON site_config FOR ALL USING (true) WITH CHECK (true);
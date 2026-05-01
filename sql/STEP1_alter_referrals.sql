-- STEP 1: Add missing columns to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS accept_token text DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS agent_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS signature_completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS referrals_accept_token_idx 
ON referrals(accept_token);


-- Referral pipeline status machine
-- Status flow: pending -> agent_notified -> agent_accepted -> client_signed -> broker_reviewed -> closed

-- Add status tracking columns to referrals if they don't exist
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status_type text DEFAULT 'pending';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status_updated_by text;

-- Create status history table
CREATE TABLE IF NOT EXISTS referral_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id uuid REFERENCES referrals(id) ON DELETE CASCADE,
    old_status text,
    new_status text,
    changed_by text,
    changed_at timestamptz DEFAULT now()
);

-- Create index on status_type for fast queries
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status_type);

-- Function to update referral status
CREATE OR REPLACE FUNCTION update_referral_status_fn(
    p_referral_id uuid,
    p_new_status text,
    p_changed_by text DEFAULT 'system'
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_old_status text;
BEGIN
    -- Get current status
    SELECT status_type INTO v_old_status 
    FROM referrals 
    WHERE id = p_referral_id;
    
    -- Only allow valid transitions
    IF v_old_status = 'pending' AND p_new_status NOT IN ('agent_notified') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', v_old_status, p_new_status;
    END IF;
    
    IF v_old_status = 'agent_notified' AND p_new_status NOT IN ('agent_accepted', 'agent_declined', 'auto_assigned') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', v_old_status, p_new_status;
    END IF;
    
    IF v_old_status = 'agent_accepted' AND p_new_status NOT IN ('client_signed', 'agent_expired') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', v_old_status, p_new_status;
    END IF;
    
    IF v_old_status = 'client_signed' AND p_new_status NOT IN ('broker_reviewed', 'broker_approved') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', v_old_status, p_new_status;
    END IF;
    
    IF v_old_status = 'broker_reviewed' AND p_new_status NOT IN ('broker_approved', 'broker_rejected') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', v_old_status, p_new_status;
    END IF;
    
    -- Update status
    UPDATE referrals 
    SET status_type = p_new_status,
        status_updated_at = now(),
        status_updated_by = p_changed_by
    WHERE id = p_referral_id;
    
    -- Log the transition
    INSERT INTO referral_status_history (referral_id, old_status, new_status, changed_by, changed_at)
    VALUES (p_referral_id, v_old_status, p_new_status, p_changed_by, now());
END;
$$;

-- Status transition functions
CREATE OR REPLACE FUNCTION fn_agent_notified(p_referral_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM update_referral_status_fn(p_referral_id, 'agent_notified', 'system');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_agent_accepted(p_referral_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM update_referral_status_fn(p_referral_id, 'agent_accepted', 'system');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_client_signed(p_referral_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM update_referral_status_fn(p_referral_id, 'client_signed', 'system');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_broker_reviewed(p_referral_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM update_referral_status_fn(p_referral_id, 'broker_reviewed', 'system');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_broker_approved(p_referral_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM update_referral_status_fn(p_referral_id, 'broker_approved', 'system');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_closed(p_referral_id uuid)
RETURNS void AS $$
BEGIN
    PERFORM update_referral_status_fn(p_referral_id, 'closed', 'system');
END;
$$ LANGUAGE plpgsql;

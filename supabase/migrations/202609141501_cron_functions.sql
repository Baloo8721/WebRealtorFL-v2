
-- Cron job 1: 72-hour auto-assign for unresponsive agents
CREATE OR REPLACE FUNCTION auto_assign_expired_referrals()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    expired_referrals RECORD;
    next_agent_id uuid;
    next_agent_email text;
BEGIN
    -- Find referrals where agent didn't respond in 72 hours
    FOR expired_referrals IN 
        SELECT id, client_id, agent_email, previous_agent_id
        FROM referrals 
        WHERE status_type = 'agent_notified' 
        AND updated_at < NOW() - INTERVAL '72 hours'
    LOOP
        -- Find next available agent (exclude current and previous agents)
        SELECT a.id, a.email INTO next_agent_id, next_agent_email
        FROM agents a
        WHERE a.id != expired_referrals.previous_agent_id
        AND NOT EXISTS (
            SELECT 1 FROM referrals r 
            WHERE r.agent_id = a.id AND r.status_type NOT IN ('closed', 'agent_declined')
        )
        LIMIT 1;
        
        IF next_agent_id IS NOT NULL THEN
            -- Update referral to next agent
            UPDATE referrals 
            SET agent_id = next_agent_id,
                agent_email = next_agent_email,
                status_type = 'agent_notified',
                updated_at = NOW(),
                status_updated_at = NOW(),
                status_updated_by = 'cron'
            WHERE id = expired_referrals.id;
            
            -- Send notification email to new agent (would call Resend via edge function)
            -- INSERT INTO email_logs...
        END IF;
    END LOOP;
END;
$$;

-- Cron job 2: Daily status reminder for agents who haven't contacted clients
CREATE OR REPLACE FUNCTION send_daily_status_reminders()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    pending_refs RECORD;
BEGIN
    -- Find referrals where agent accepted but hasn't contacted client in 48 hours
    FOR pending_refs IN 
        SELECT id, agent_email, client_email, client_name
        FROM referrals 
        WHERE status_type = 'agent_accepted' 
        AND last_contact < NOW() - INTERVAL '48 hours'
        AND last_contact IS NOT NULL
    LOOP
        -- Would send nag email here via Resend
        -- INSERT INTO email_logs (recipient, email_type, status)
        -- VALUES (pending_refs.agent_email, 'status_reminder', 'queued')
    END LOOP;
END;
$$;

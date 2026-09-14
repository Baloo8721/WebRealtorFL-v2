
-- Affiliate click tracking table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
    affiliate_source text NOT NULL,
    affiliate_medium text,
    affiliate_campaign text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    ip_address inet,
    user_agent text,
    clicked_at timestamptz DEFAULT now(),
    converted_at timestamptz,
    converted boolean DEFAULT false
);

-- Index for fast affiliate source queries
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_source ON affiliate_clicks(affiliate_source);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at);

-- Create function to track affiliate click from client submission
CREATE OR REPLACE FUNCTION track_affiliate_click(
    p_client_id uuid,
    p_affiliate_source text,
    p_ip_address text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO affiliate_clicks (
        client_id,
        affiliate_source,
        ip_address,
        clicked_at,
        converted
    )
    VALUES (
        p_client_id,
        p_affiliate_source,
        p_ip_address,
        NOW(),
        false
    );
END;
$$;

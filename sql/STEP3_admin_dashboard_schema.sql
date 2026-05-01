-- STEP 3: Add scraper logs table and RLS policies for admin dashboard

-- Add scraper logs table
CREATE TABLE IF NOT EXISTS scraper_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  state text NOT NULL,
  agents_found int DEFAULT 0,
  agents_added int DEFAULT 0,
  scraped_at timestamptz DEFAULT now()
);

-- Enable Row Level Security for admin access
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON agents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON referrals FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update agents
CREATE POLICY "Allow authenticated insert agents" ON agents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update agents" ON agents FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to update referrals
CREATE POLICY "Allow authenticated update referrals" ON referrals FOR UPDATE USING (auth.role() = 'authenticated');

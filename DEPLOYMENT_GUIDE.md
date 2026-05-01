# Deployment Guide - WebRealtor Automation System

Complete step-by-step guide to deploy the Node.js automation system with Render, Supabase, and GitHub Pages.

## Prerequisites

- Supabase account (already have)
- Render.com account (free)
- Resend.com account (free)
- GitHub account (already have)

## Step 1: Run SQL Schema Updates in Supabase

1. Go to your Supabase project: https://dponfdhixuxriqqxbbri.supabase.co
2. Navigate to SQL Editor
3. Run each SQL file in order:

**File 1:** `sql/STEP1_alter_referrals.sql`
- Adds accept_token, agent_accepted_at, signature_completed_at columns to referrals table
- Creates unique index on accept_token

**File 2:** `sql/STEP2_match_agents_function.sql`
- Updates match_agents function with your actual column names
- Uses pgvector for similarity search

**File 3:** `sql/STEP3_admin_dashboard_schema.sql`
- Creates scraper_logs table
- Enables Row Level Security
- Creates policies for admin dashboard access

## Step 2: Set Up Resend for Email

1. Go to https://resend.com and sign up (free)
2. Navigate to API Keys
3. Create a new API key
4. Copy the API key - you'll need it for Render

## Step 3: Deploy Render Server

### Option A: Deploy via GitHub (Recommended)

1. **Create a new GitHub repo** for the backend:
   - Name: `webrealtor-backend`
   - Make it public or private (your choice)

2. **Push render-server folder to GitHub:**
   ```bash
   cd /Users/tylerbelisle/WebRealtorFL-v2
   git init
   git add render-server/
   git commit -m "Add render server"
   git remote add origin https://github.com/YOUR_USERNAME/webrealtor-backend.git
   git push -u origin main
   ```

3. **Deploy to Render:**
   - Go to https://dashboard.render.com
   - Click "New +"
   - Select "Web Service"
   - Connect to your GitHub repo
   - Configure:
     - **Name:** webrealtor-backend
     - **Region:** Oregon (or closest to you)
     - **Branch:** main
     - **Root Directory:** render-server
     - **Build Command:** `npm install && npx playwright install chromium`
     - **Start Command:** `node index.js`
   - Click "Create Web Service"

4. **Add Environment Variables in Render:**
   - Go to your service settings → Environment
   - Add these variables:
     ```
     SUPABASE_URL=https://dponfdhixuxriqqxbbri.supabase.co
     SUPABASE_SERVICE_KEY=your_service_role_key_from_supabase
     RESEND_API_KEY=your_resend_api_key
     TEST_EMAIL_ONLY=true
     TEST_EMAIL_ADDRESS=your-email@example.com
     PORT=3000
     EDGE_FUNCTION_SECRET=generate_a_random_secret_here
     ```

5. **Get your Render URL:**
   - After deployment, Render will give you a URL like: `https://webrealtor-backend.onrender.com`
   - Copy this URL - you'll need it for Supabase Edge Function

### Option B: Deploy Locally for Testing

```bash
cd render-server
npm install
cp .env.example .env
# Edit .env with your values
node index.js
```

## Step 4: Deploy Supabase Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Link to your Supabase project:**
   ```bash
   cd /Users/tylerbelisle/WebRealtorFL-v2
   supabase link --project-ref dponfdhixuxriqqxbbri
   ```

3. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy handle-referral
   ```

4. **Add Environment Variables in Supabase:**
   - Go to Supabase Dashboard → Edge Functions → handle-referral
   - Add these environment variables:
     ```
     SUPABASE_URL=https://dponfdhixuxriqqxbbri.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     RENDER_SERVER_URL=https://webrealtor-backend.onrender.com
     EDGE_FUNCTION_SECRET=same_secret_you_used_in_render
     ```

5. **Get your Edge Function URL:**
   - It will be: `https://dponfdhixuxriqqxbbri.supabase.co/functions/v1/handle-referral`

## Step 5: Update Form Configuration

1. **Edit config.js:**
   ```javascript
   form: {
     edgeFunctionUrl: 'https://dponfdhixuxriqqxbbri.supabase.co/functions/v1/handle-referral',
     edgeFunctionSecret: 'your_secret_here', // Same as in Render
     enableGeoDetection: true,
     defaultLanguage: 'en'
   }
   ```

2. **Replace `your_secret_here`** with the actual EDGE_FUNCTION_SECRET you set in Render and Supabase

## Step 6: Seed Test Agents

1. **Option A: Run locally:**
   ```bash
   cd render-server
   npm install
   # Create .env with your Supabase credentials
   node seed-agents.js
   ```

2. **Option B: Run on Render (after deployment):**
   - Add a script to package.json or use Render shell
   - Or run locally since it's a one-time operation

## Step 7: Deploy Admin Dashboard to GitHub Pages

1. **Create a new GitHub repo** for the admin dashboard:
   - Name: `webrealtor-admin-dashboard`
   - Make it private (recommended)

2. **Push admin-dashboard folder:**
   ```bash
   cd /Users/tylerbelisle/WebRealtorFL-v2/admin-dashboard
   git init
   git add index.html
   git commit -m "Add admin dashboard"
   git remote add origin https://github.com/YOUR_USERNAME/webrealtor-admin-dashboard.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repo settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

4. **Update admin-dashboard/index.html:**
   - Replace `YOUR_ANON_KEY` with your Supabase anon key (from Supabase Dashboard → API)
   - Replace `YOUR_RENDER_URL` with your Render server URL

5. **Set up Supabase Auth:**
   - Go to Supabase Dashboard → Authentication
   - Enable Email auth
   - Create your admin user account
   - The dashboard will use this for login

6. **Access your dashboard:**
   - URL: `https://YOUR_USERNAME.github.io/webrealtor-admin-dashboard`

## Step 8: Test the System

1. **Test form submission:**
   - Open your main site (index.html)
   - Fill out the form
   - Submit
   - Check that:
     - Client appears in Supabase clients table
     - Client has embedding
     - Referrals created in referrals table
     - Email sent to your test email (not to agent)

2. **Test admin dashboard:**
   - Go to your admin dashboard URL
   - Login with your Supabase auth credentials
   - Check that:
     - Stats load correctly
     - Clients appear
     - Referrals appear
     - Agents appear

3. **Test scraper:**
   - In admin dashboard, go to Scraper tab
   - Enter a city (e.g., "Miami")
   - Click Scrape
   - Check that agents are added to Supabase

## Step 9: Go Live (After Testing)

To switch from test mode to live emails:

1. **Update Render environment variables:**
   - Set `TEST_EMAIL_ONLY=false`
   - Remove or set `TEST_EMAIL_ADDRESS` to empty

2. **Test with one real submission:**
   - Submit a test form
   - Verify email goes to actual agent
   - Verify email goes to actual client

3. **Monitor in Resend dashboard:**
   - Check email delivery status
   - Monitor bounce rates

## Step 10: Set Up Nightly Scraping

The Render server already has a cron job scheduled for 2am daily. It will automatically scrape:
- Miami
- Orlando
- Tampa
- Jacksonville

To add more cities, edit `render-server/index.js` and redeploy.

## Troubleshooting

**Edge Function returns 401 Unauthorized:**
- Check that EDGE_FUNCTION_SECRET matches in both Render and Supabase
- Check that the header is being sent correctly in index.html

**Embeddings not generating:**
- Check that Render server is running
- Check that RENDER_SERVER_URL is correct in Supabase Edge Function env vars
- Check browser console for errors

**Scraper not working:**
- Realtor.com may have changed their HTML structure
- Update selectors in `render-server/scraper.js`
- Test manually first before relying on cron

**Emails not sending:**
- Check Resend API key is correct
- Check Resend dashboard for error logs
- Verify TEST_EMAIL_ONLY setting

**Admin dashboard not loading:**
- Check SUPABASE_KEY is correct (anon key, not service role key)
- Check that RLS policies are set correctly
- Check browser console for errors

## File Structure After Deployment

```
WebRealtorFL-v2/
├── index.html (updated form)
├── config.js (updated with Edge Function URL)
├── sql/
│   ├── STEP1_alter_referrals.sql
│   ├── STEP2_match_agents_function.sql
│   └── STEP3_admin_dashboard_schema.sql
├── render-server/ (deployed to Render)
│   ├── package.json
│   ├── .env.example
│   ├── index.js
│   ├── embedder.js
│   ├── scraper.js
│   ├── mailer.js
│   └── seed-agents.js
├── supabase/
│   └── functions/
│       └── handle-referral/
│           └── index.ts (deployed to Supabase)
└── admin-dashboard/
    └── index.html (deployed to GitHub Pages)
```

## Next Steps After Deployment

1. **Clone for new sites:**
   - Copy index.html and config.js
   - Change `sourceWebsite` in config.js
   - Deploy to new GitHub Pages repo
   - All sites use the same backend

2. **Add more agents:**
   - Use admin dashboard to add manually
   - Or let scraper run nightly
   - Or manually trigger scraper for specific cities

3. **Monitor performance:**
   - Check admin dashboard analytics
   - Monitor Resend email logs
   - Check Render server logs

4. **Scale up:**
   - Add more cities to scraper
   - Improve scraper selectors
   - Add more test data
   - Optimize embeddings

## Support

If you encounter issues:
1. Check Render logs: https://dashboard.render.com
2. Check Supabase logs: https://dponfdhixuxriqqxbbri.supabase.co/logs
3. Check Resend logs: https://resend.com/logs
4. Check browser console for frontend errors

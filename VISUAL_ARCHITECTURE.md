# VISUAL ARCHITECTURE & DECISION TREES

## System Overview (How Everything Connects)

```
                        ┌─────────────────────────────────────────────────┐
                        │         YOUR SYSTEM (Everything Here)           │
                        └─────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ INPUT LAYER: Multiple Websites                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Website 1          Website 2          Website 3    ...   Website 100   │
│  (Form)            (Form)             (Form)             (Form)         │
│  site=partner1     site=partner2      site=partner3    site=partner100  │
│     │                 │                  │                 │             │
│     └─────────────────┴──────────────────┴─────────────────┘             │
│                          │                                               │
└──────────────────────────┼───────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PROCESSING LAYER: n8n Workflows                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ MAIN WORKFLOW: Form Submission Handler                         │   │
│  │                                                                 │   │
│  │  1. Receive webhook (form data)                               │   │
│  │  2. Validate & extract fields                                 │   │
│  │  3. Detect user geo (auto IP/timezone)                        │   │
│  │  4. Generate client embedding (384-dim vector)                │   │
│  │  5. Insert client to Supabase                                 │   │
│  │  6. Find top 10 matching agents (vector similarity)           │   │
│  │  7. Create referral records (client → agents)                 │   │
│  │  8. Send emails:                                              │   │
│  │     - Client confirmation                                     │   │
│  │     - Agent introductions (10 emails)                         │   │
│  │  9. Schedule follow-ups (Day 3, 7, 14)                        │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ SCHEDULED WORKFLOW: Daily Agent Scraper                        │   │
│  │  (Runs daily at 9 AM UTC)                                      │   │
│  │                                                                 │   │
│  │  1. Crawl 5 broker websites (Realtor, Zillow, Compass, etc)    │   │
│  │  2. Extract agent profiles                                    │   │
│  │  3. Deduplicate by email/phone                                │   │
│  │  4. Generate embeddings for new agents                        │   │
│  │  5. Upsert to agents table (update or insert)                 │   │
│  │  6. Mark old agents as inactive                               │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ SCHEDULED WORKFLOW: Follow-up Sequences                        │   │
│  │  (Runs every 6 hours)                                          │   │
│  │                                                                 │   │
│  │  1. Find referrals created 3+ days ago with no response        │   │
│  │  2. Send client check-in: "Have agents reached out?"           │   │
│  │  3. Find agent no-responses created 7+ days ago                │   │
│  │  4. Send agent reminder: "Client is waiting..."               │   │
│  │  5. Mark very old referrals as "lost"                          │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ SCHEDULED WORKFLOW: Social Media Automation                    │   │
│  │  (Runs daily at 8 AM, 12 PM, 6 PM)                             │   │
│  │                                                                 │   │
│  │  1. Check for new closed deals (referral status = closed)      │   │
│  │  2. Generate social media post (AI-powered)                    │   │
│  │  3. Post to Twitter, LinkedIn, Instagram                       │   │
│  │  4. Track engagement metrics                                   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ DATA LAYER       │ │ COMPUTE      │ │ INTEGRATIONS     │
│ (Supabase)       │ │              │ │                  │
├──────────────────┤ ├──────────────┤ ├──────────────────┤
│ • clients        │ │ Vector       │ │ • Gmail (email)  │
│ • agents         │ │ embedding    │ │ • Twitter API    │
│ • referrals      │ │ generation   │ │ • LinkedIn API   │
│ • email_logs     │ │              │ │ • Instagram API  │
│ • documents      │ │ Crawl4AI     │ │ • Supabase       │
│ • n8n_history    │ │ (scraping)   │ │   Realtime DB    │
│                  │ │              │ │                  │
│ PostgreSQL       │ │ LLM models   │ │ • Webhooks (n8n) │
│ with pgvector    │ │ (OpenAI,     │ │                  │
│ extension        │ │  Ollama)     │ │                  │
└──────────────────┘ └──────────────┘ └──────────────────┘

            ▼              ▼              ▼
            └──────────────┼──────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ OUTPUT LAYER: Notifications & Tracking                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐          │
│  │ CLIENT EMAILS  │  │  AGENT EMAILS  │  │ FOLLOW-UP EMAILS │          │
│  ├────────────────┤  ├────────────────┤  ├──────────────────┤          │
│  │ • Confirmation │  │ • Match intro  │  │ • Day 3: Check-in│          │
│  │ • Top 3 agents │  │ • 1-click      │  │ • Day 7: Reminder│          │
│  │ • Next steps   │  │   Accept btn   │  │ • Day 14: Status │          │
│  │ • Support link │  │ • Client brief │  │ • Monthly survey │          │
│  └────────────────┘  └────────────────┘  └──────────────────┘          │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐          │
│  │ SOCIAL POSTS   │  │ ADMIN REPORTS  │  │ CRM INTEGRATION  │          │
│  ├────────────────┤  ├────────────────┤  ├──────────────────┤          │
│  │ • Twitter      │  │ • Daily leads  │  │ • HubSpot (future)          │
│  │ • LinkedIn     │  │ • Match stats  │  │ • Pipedrive (future)        │
│  │ • Instagram    │  │ • Agent perf   │  │ • Salesforce (future)       │
│  │ • TikTok       │  │ • Conversion % │  │                  │          │
│  └────────────────┘  └────────────────┘  └──────────────────┘          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## MATCHING ALGORITHM (The Secret Sauce)

```
CLIENT SUBMITS FORM
   │
   ▼
┌─────────────────────────────────────┐
│ STEP 1: Extract & Normalize Data    │
├─────────────────────────────────────┤
│                                     │
│ desired_city: "Miami, FL"           │
│ current_city: "New York, NY"        │
│ client_type: ["Buyer"]              │
│ budget: 500000                      │
│ specialties: ["Crypto"]             │
│ language: "Spanish"                 │
│ timeline: "3-6 Months"              │
│ notes: "First-time buyer, investor" │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 2: Create Client Profile Text  │
├─────────────────────────────────────┤
│                                     │
│ "Buyer in Miami, FL. Budget        │
│  $500,000. Crypto specialist       │
│  needed. Timeline: 3-6 months.      │
│  First-time buyer, investor.       │
│  Language: Spanish."                │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 3: Generate Embedding Vector   │
├─────────────────────────────────────┤
│                                     │
│ Model: Xenova/all-MiniLM-L6-v2     │
│ Input: Client profile text          │
│ Output: 384-dimensional vector      │
│                                     │
│ [0.234, 0.891, -0.123, 0.567,     │
│  -0.234, 0.123, ..., 0.890]        │
│                                     │
│ Semantic meaning captured!          │
│ (What the profile MEANS, not just   │
│  keywords)                          │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 4: Save Client to Database     │
├─────────────────────────────────────┤
│                                     │
│ INSERT INTO clients (                │
│   name, email, desired_city,        │
│   budget, embedding, ...             │
│ ) VALUES (...)                      │
│                                     │
│ Now client has a vector signature   │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 5: Find Similar Agents         │
├─────────────────────────────────────┤
│                                     │
│ SELECT agents                       │
│ WHERE embedding IS SIMILAR          │
│ ORDER BY vector_distance            │
│ LIMIT 10                            │
│                                     │
│ Database compares client vector     │
│ to all 500+ agent vectors           │
│ Returns 10 closest matches           │
│                                     │
│ Agents that match on:               │
│ ✓ Serve Miami                       │
│ ✓ Handle crypto deals               │
│ ✓ Speak Spanish                     │
│ ✓ Work with first-time buyers       │
│ ✓ Handle investor deals             │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ STEP 6: Calculate Match Scores      │
├─────────────────────────────────────┤
│                                     │
│ For each of 10 agents:              │
│ (Using weighted scoring)            │
│                                     │
│ vector_score = 1 - distance         │
│               = 0.85                │
│                                     │
│ location_score = serves city?       │
│                = 1.0                │
│                                     │
│ specialty_score = has specialty?    │
│                 = 0.9               │
│                                     │
│ language_score = speaks language?   │
│               = 1.0                 │
│                                     │
│ response_score = response rate      │
│               = 0.7                 │
│                                     │
│ FINAL = weighted sum of above       │
│       = 0.30(0.85) + 0.25(1.0)     │
│         + 0.20(0.9) + 0.15(1.0)    │
│         + 0.10(0.7)                 │
│       = 0.89 (89% match!)           │
│                                     │
│ Result:                             │
│ Agent A: 89% match                  │
│ Agent B: 87% match                  │
│ Agent C: 84% match                  │
│ Agent D: 82% match                  │
│ ... (down to 10th agent)            │
│                                     │
└──────────────┬──────────────────────┘
               │
               ▼
         SEND EMAILS
    (Agent intros, client confirmation)
```

---

## DECISION TREE: What Goes Where?

```
┌─ Should I use vector embeddings?
│  ├─ Y: You have 100+ agents to match ✓ (DO THIS)
│  └─ N: < 10 agents, use simple filters instead
│
├─ What embedding model?
│  ├─ Xenova/all-MiniLM-L6-v2 (384-dim) ← FREE, LOCAL, FAST ✓
│  ├─ OpenAI (1536-dim) = $0.02 per 1M tokens
│  └─ Hugging Face (varies) = API limits
│
├─ Where to host the form?
│  ├─ Your main site (yoursite.com/form) ← MVP ✓
│  │  └─ Easy maintenance
│  │  └─ Works with iFrame embedding
│  │
│  └─ White-labeled on partner sites
│     └─ partner1.com/form (looks like theirs)
│     └─ More complex, wait until 10+ partners
│
├─ Where to host n8n?
│  ├─ n8n.cloud (SaaS) ← Start here ✓
│  │  └─ $25/month paid tier (free tier = 100 execs/month)
│  │  └─ No server management
│  │  └─ Can't scrape local resources
│  │
│  └─ Self-hosted Docker
│     └─ $5-10/month VPS
│     └─ Full control
│     └─ Need to manage yourself
│
├─ Agent scraping strategy?
│  ├─ Crawl4AI (your current setup) ← DO THIS ✓
│  │  └─ Multi-site scraping
│  │  └─ Handles JavaScript-heavy sites
│  │  └─ Free but needs hosting
│  │
│  ├─ MLS API direct (paid)
│  │  └─ Realtor.com feed
│  │  └─ Real-time agents
│  │
│  └─ Manual CSV imports
│     └─ Partners send agent lists
│     └─ Most reliable
│
├─ Email sending?
│  ├─ Gmail SMTP (free) ← MVP ✓
│  │  └─ 500/day limit (plenty for early stage)
│  │  └─ Simple setup
│  │  └─ Can get spam-filtered
│  │
│  ├─ SendGrid (free tier = 100/day)
│  │  └─ Better deliverability
│  │  └─ Professional transactional emails
│  │
│  └─ Your own mail server
│     └─ Complex, not recommended
│
├─ Database?
│  ├─ Supabase (you have this) ← KEEP IT ✓
│  │  └─ PostgreSQL with pgvector
│  │  └─ Realtime subscriptions
│  │  └─ Auth included
│  │
│  └─ Self-hosted PostgreSQL
│     └─ More control
│     └─ Harder to maintain
│
└─ Analytics & Tracking?
   ├─ Supabase dashboards (SQL) ← MVP ✓
   │  └─ No cost
   │  └─ Powerful queries
   │
   ├─ Metabase (free, self-hosted)
   │  └─ Beautiful dashboards
   │
   └─ Third-party BI tool
      └─ Tableau, Looker, etc.
      └─ Expensive
```

---

## MULTI-SITE SCALING ROADMAP

```
PHASE 1: SINGLE SITE (Week 1-4)
┌────────────────────────────────┐
│ yoursite.com/form              │
│ (Test everything here)         │
│                                │
│ • Form works                   │
│ • Clients inserted             │
│ • Agents matched               │
│ • Emails sent                  │
│ • Follow-ups automated         │
└────────────────────────────────┘
         │
         ▼
PHASE 2: SHARED EMBEDDED (Week 5-8)
┌────────────────────────────────┐
│ yoursite.com/form (main)       │
│ (iFrame embedded on 5 sites)   │
│                                │
│ <iframe src="yoursite.com/     │
│  form?source=partner1" />      │
│                                │
│ Partners: Partner1, 2, 3, 4, 5 │
└────────────────────────────────┘
         │
         ▼
PHASE 3: WHITE-LABELED (Week 9+)
┌────────────────────────────────────┐
│ partner1.com/form                  │
│ (Looks like their site, our code)  │
│                                    │
│ White-label components:            │
│ ✓ Colors match their brand         │
│ ✓ Logo is theirs                   │
│ ✓ "Powered by" footer (your name)  │
│ ✓ Their domain, your backend       │
│                                    │
│ Config: config.js for each site    │
│         (centralized customization)│
│                                    │
│ Track per-site ROI:                │
│ • Leads per site                   │
│ • Conversion rate per site         │
│ • Agent preferences per site       │
└────────────────────────────────────┘
         │
         ▼
PHASE 4: SCALE TO 100+ (Month 3+)
┌────────────────────────────────────┐
│ 100+ white-labeled instances       │
│ (Different brokers, regions, etc)  │
│                                    │
│ Dashboard shows:                   │
│ • Total leads: 10,000/month        │
│ • Conversion: 15%                  │
│ • Revenue: $50,000/month           │
│ • Top performing sites             │
│ • Top performing agents            │
│                                    │
│ Fully automated:                   │
│ • Matching (instant)               │
│ • Email (instant)                  │
│ • Follow-ups (scheduled)           │
│ • Scraping (daily)                 │
│ • Payouts (weekly)                 │
└────────────────────────────────────┘
```

---

## COST BREAKDOWN (Fully Self-Hosted, MVP)

```
                          MONTHLY COST

┌─────────────────────────────────────────────┐
│ Supabase (Free Tier)                        │
│ ✓ 500MB database                            │
│ ✓ 2GB bandwidth                             │
│ ✓ Real-time subscriptions                   │
│ ✓ Auth included                             │
│                                             │
│ Cost: $0                                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ n8n Cloud (Free Tier)                       │
│ ✓ 100 executions/month                      │
│ ✓ Community workflows                       │
│ ✗ Scraping limited (can't access localhost)│
│                                             │
│ Cost: $0 (then $25 for paid tier)           │
│                                             │
│ OR n8n Self-Hosted                          │
│ ✓ Unlimited executions                      │
│ ✓ Full control                              │
│ ✓ Can run local services                    │
│ Cost: $5-10 (VPS) + your management        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Hosting for Crawl4AI Scraper               │
│ ✓ Railway.app (free tier)                   │
│ ✓ Render.com (free tier)                    │
│ ✓ DigitalOcean ($5/month)                   │
│                                             │
│ Cost: $0-5                                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Email (Gmail SMTP)                          │
│ ✓ Free                                      │
│ ✓ 500/day limit (plenty for MVP)            │
│                                             │
│ Cost: $0                                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ LLM Models (for content generation)         │
│ ✓ Ollama (free, local)                      │
│ ✓ OpenAI API ($5-20/month for usage)        │
│                                             │
│ Cost: $0-20                                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Domain Name                                 │
│ ✓ .com domain                               │
│                                             │
│ Cost: $12/year                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           TOTAL MONTHLY: $0-20              │
│                                             │
│ (Scales to $50-100/month at volume)         │
└─────────────────────────────────────────────┘
```

---

## SUCCESS METRICS TO TRACK

```
LEAD METRICS
├─ Leads per day: ________
├─ Leads per site: ________
├─ Leads per language: ________
├─ Lead quality score: ________ (avg)
└─ Leads by source: ________

MATCHING METRICS
├─ Avg match score: ________ (target: 75+)
├─ Agents per client: ________ (should be 10)
├─ Specialty match rate: ________ (% matching)
├─ Location match rate: ________ (% in right city)
└─ Language match rate: ________ (% speaking language)

ENGAGEMENT METRICS
├─ Client email open rate: ________ (target: 40+%)
├─ Agent email open rate: ________ (target: 50+%)
├─ Agent acceptance rate: ________ (% who accept)
├─ Agent response time: ________ hours (target: < 4h)
└─ Client conversion rate: ________ (% who close deal)

AGENT METRICS
├─ Active agents in DB: ________
├─ Agents with responses: ________
├─ Avg agent rating: ________
├─ Top performing agent: ________
├─ Agent avg monthly referrals: ________
└─ Agent conversion rate: ________ %

REVENUE METRICS (Future)
├─ Referral fee per deal: $________
├─ Deal close rate: ________%
├─ Avg deal value: $________
├─ Monthly referral revenue: $________
└─ Cost per acquisition: $________
```

---

## QUICK DECISION: WHERE TO START?

```
Do you have agents in Supabase?
│
├─ NO: "I don't know how many agents I have"
│  └─> RUN SCRAPER FIRST
│      1. Deploy Crawl4AI
│      2. Scrape 5 sites for agents
│      3. Get minimum 200 agents
│      4. Then proceed
│
├─ YES < 50: "I have some agents but not many"
│  └─> OK FOR MVP TESTING
│      1. Start embedding pipeline
│      2. Test matching with small pool
│      3. Run scraper in parallel
│
└─ YES > 100: "I have a solid agent database"
   └─> PROCEED IMMEDIATELY
       1. Start embedding generation
       2. Activate matching workflow
       3. Deploy to 5 test sites
       4. Scale to 100+ next month
```

**Run this SQL to find out:**
```sql
SELECT COUNT(*) as total_agents,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_agents,
       COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as embedded_agents
FROM agents;
```

**If total_agents > 100: GO. If < 50: SCRAPE FIRST.**

---

That's your complete architecture. Study this, answer the questions in the implementation checklist, and we'll build piece by piece.

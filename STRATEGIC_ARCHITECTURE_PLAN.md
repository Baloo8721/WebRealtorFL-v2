# Strategic Architecture Plan: AI-Powered Real Estate Referral Network

**Date:** April 30, 2026  
**Goal:** 100+ websites → AI agent matching → Automated workflow → Lead conversion pipeline  
**Scope:** 100% self-hosted, open-source, Supabase + n8n, no 3rd party dependencies  

---

## EXECUTIVE SUMMARY

You're building a **referral arbitrage system** where:
- Clients submit forms on partner websites (yours or white-labeled)
- AI instantly matches them with best-fit agents (from your Supabase agent database)
- n8n automates entire workflow (emails, referral tracking, follow-up)
- Social marketing drives leads into the funnel
- You monetize via agent referral fees and potential white-label licensing

**Key insight:** This works because 90% of agents are *bad at* matching clients with agents who fit them. You're solving this with AI vectors + specialties + language + geography.

---

## PART 1: CURRENT STATE ASSESSMENT

### ✅ WHAT YOU HAVE (Completed)

| Component | Status | Notes |
|-----------|--------|-------|
| Form system | ✅ Working | Client/buyer info collection, multi-language ready |
| Supabase schema | ✅ Schema exists | `clients`, `agents`, `referrals`, `email_logs`, `documents` tables |
| Form → Supabase pipeline | ✅ Working | n8n webhook receives form, inserts to `clients` table |
| Geo-location tracking | ✅ Working | `user_geo` field captures where form submitted |
| Chatbot | ✅ Working | Web3/real estate Q&A, mortgage calculator, embedded on pages |
| Multi-language support | ✅ Working | English, Spanish, Mandarin, Arabic in form |
| Theme customization | ✅ Working | Centralized `config.js` for easy white-labeling |
| Agent scraper infrastructure | ⚠️ Partial | Crawl4AI API exists but not fully integrated into workflow |

### ❌ WHAT YOU DON'T HAVE (Critical Gaps)

| Gap | Impact | Solution |
|-----|--------|----------|
| **Agent database population** | 🔴 CRITICAL | You need real agents in `agents` table. Scraper is built but needs tuning/deployment |
| **AI vector embeddings** | 🔴 CRITICAL | Client profiles and agents need vector embeddings for semantic matching. Schema has `embedding` column but code doesn't generate them |
| **Automated agent matching** | 🔴 CRITICAL | Simple query exists (`n8n-agent-matcher-simple.json`) but not in main workflow. Needs to run on every form submission |
| **Referral creation automation** | 🟡 HIGH | No code creates `referrals` table records linking clients to matched agents |
| **Email automation to agents** | 🟡 HIGH | You send emails to yourself, not to agents. Need workflow to notify agents of matches |
| **Follow-up sequences** | 🟡 HIGH | No automated follow-ups for clients/agents if no response |
| **Multi-site deployment** | 🟡 HIGH | Form works but no strategy for 100+ domains, white-labeling, tracking per-domain ROI |
| **Social marketing engine** | 🟡 HIGH | No automated social posting, lead magnet funnels, or organic growth strategy |
| **Lead scoring** | 🟠 MEDIUM | No way to flag "hot" leads (high budget, ready to move, pre-approved) |
| **Agent pool discovery** | 🟠 MEDIUM | Scraper works, but needs automated daily/weekly runs to keep agent DB fresh |

---

## PART 2: ARCHITECTURE DESIGN

### 2.1 DATA FLOW OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LEAD GENERATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Website 1    Website 2    Website 3  ...  Website N                        │
│  (Form)       (Form)       (Form)           (Form)                          │
│     │             │            │              │                             │
│     └─────────────┴────────────┴──────────────┘                             │
│                        │                                                    │
│                        ▼                                                    │
│              n8n Webhook Receiver                                           │
│              (Central hub for all sites)                                    │
│                        │                                                    │
└────────────────────────┼────────────────────────────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
       ┌─────────┐  ┌──────────┐  ┌─────────────────┐
       │ Validate│  │Generate  │  │ Track Source &  │
       │  Data   │  │Embeddings│  │    Geo          │
       └────┬────┘  └────┬─────┘  └────┬────────────┘
            │            │             │
            └────────────┼─────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Insert Client│
                  │ to Supabase  │
                  └──────┬───────┘
                         │
            ┌────────────┼────────────────────┐
            │            │                    │
            ▼            ▼                    ▼
     ┌────────────┐  ┌─────────────┐  ┌──────────────┐
     │Vector Match│  │Create       │  │Email Confirm │
     │Top 10 Agents│  │Referrals    │  │to Client     │
     └─────┬──────┘  └────┬────────┘  └──────┬───────┘
           │              │                  │
           └──────────────┼──────────────────┘
                          │
                          ▼
              ┌──────────────────────────┐
              │Email Matched Agents      │
              │ + Client Intro Package   │
              └─────────────┬────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │ Follow-up Sequences      │
              │ (3-7 day touchpoints)    │
              └──────────────────────────┘
```

### 2.2 DATABASE SCHEMA (Already Exists - Minor Updates Needed)

#### **clients table**
- ✅ All fields exist
- Add: `vector_embedding` (vector type) for semantic matching
- Add: `lead_score` (integer 0-100) for prioritization
- Add: `status` (enum: new, matched, referred, completed, lost)

#### **agents table**
- ✅ Most fields exist
- Add: `vector_embedding` for semantic matching
- Add: `monthly_referral_volume` (tracks how many referrals they get)
- Add: `response_rate` (% of referrals they respond to)
- Add: `conversion_rate` (% of referrals that close)

#### **referrals table**
- ✅ Structure exists
- Add: `status` (pending, accepted, rejected, closed)
- Add: `created_at`, `accepted_at`, `closed_at` timestamps
- Add: `commission_amount` (future monetization tracking)

---

## PART 3: TECHNICAL ARCHITECTURE

### 3.1 The AI Matching Engine

**Problem:** How to match clients to agents intelligently?

**Solution:** Vector embeddings (semantic similarity)

```javascript
// Client vector example
Client Profile Vector:
[
  "wants to buy",
  "moving from Miami, FL",
  "moving to Tampa, FL", 
  "has $500k budget",
  "needs crypto specialist",
  "speaks English + Spanish",
  "timeline: 3-6 months",
  "first-time homebuyer"
]
  ↓ (Embed using open-source model: Xenova/all-MiniLM-L6-v2)
[0.234, 0.891, -0.123, ... 384 dimensions total]

Agent vector example:
Agent Profile Vector:
[
  "sells single-family homes",
  "serves Tampa, FL area",
  "crypto transactions specialist",
  "speaks English + Spanish",
  "5 years experience",
  "4.8 star rating",
  "$200k+ monthly volume"
]
  ↓ (Same embedding model for consistency)
[0.245, 0.885, -0.118, ...]

// Calculate similarity (cosine distance)
Match Score = 1 - distance([client], [agent]) 
// Result: 0-1 scale (0 = no match, 1 = perfect match)
```

**Why this works:**
- Captures semantic meaning (not just keywords)
- Language-agnostic (same embedding for "agent who speaks Spanish" regardless of language)
- Handles nuance (e.g., "crypto expertise" matches with agents who mention Bitcoin, blockchain, NFT deeds, etc.)
- Scales to 1000+ agents in milliseconds

### 3.2 Matching Criteria (Multi-dimensional)

```
Agent Match Score = (0.30 × Vector Similarity)
                  + (0.25 × Location Match)
                  + (0.20 × Specialty Match)
                  + (0.15 × Language Match)
                  + (0.10 × Availability/Response Rate)

Example:
- Vector match: 0.85 (7-day old vector embeddings)
- Location: 1.0 (agent serves target city)
- Specialty: 0.8 (agent has "crypto" specialty, client needs it)
- Language: 1.0 (client Spanish, agent Spanish)
- Response rate: 0.7 (agent responds to 70% of referrals)

FINAL SCORE = 0.30(0.85) + 0.25(1.0) + 0.20(0.8) + 0.15(1.0) + 0.10(0.7)
            = 0.255 + 0.25 + 0.16 + 0.15 + 0.07 = 0.885 (88.5%)
```

---

## PART 4: n8n WORKFLOW ARCHITECTURE

### 4.1 Main Workflow: "Client → Agents → Automation"

**Trigger:** Form submitted from any website

**Steps (in order):**

1. **Webhook Receiver**
   - Accept POST from form
   - Validate all required fields
   - Extract `site_source`, `user_geo`, `preferred_language`

2. **Generate Client Embedding**
   - Concatenate: `desired_city` + `specialties` + `client_type` + `notes`
   - Send to Xenova embedding API (or local model)
   - Get back 384-dimensional vector

3. **Validate Data**
   - Check for duplicates (same email in last 24h)
   - Validate location data
   - Validate email format

4. **Insert Client to Supabase**
   - Create record in `clients` table
   - Include embedding vector
   - Set `status = "new"`
   - Calculate `lead_score` (budget × preapproval × timeline)

5. **Query Matching Agents** (Vector similarity + filters)
   ```sql
   SELECT TOP 10 agents
   WHERE is_active = true
     AND service_cities CONTAINS client.desired_city
     AND (specialties OVERLAP client.specialties OR specialties IS NULL)
     AND (languages CONTAINS client.language OR 'English' IN languages)
   ORDER BY (1 - vector_distance(agent.embedding, client.embedding)) DESC
   LIMIT 10
   ```

6. **Create Referral Records**
   - For each of top 10 agents
   - Insert record in `referrals` table
   - Set `status = "pending"`
   - Link client_id → agent_id

7. **Send Client Confirmation Email**
   - "We found 10 agents matched to you!"
   - Summary of top 3 agents
   - What to expect next (7-day follow-up)
   - Include chatbot link for questions

8. **Send Agent Introduction Emails** (Parallel)
   - For each top 10 agent
   - "New client match for you!"
   - Client summary (no contact info yet)
   - Quick accept/reject action
   - Client details only if they accept

9. **Schedule Follow-up Sequences**
   - Day 3: Client follow-up ("Have agents reached out?")
   - Day 7: Agent follow-up ("Do you want to work with this client?")
   - Day 14: Check referral status, mark as lost if no response

---

## PART 5: DEPLOYMENT STRATEGY FOR 100+ SITES

### 5.1 Multi-Site Architecture

**Option A: Shared Form (Recommended for MVP)**
```
Your Domain:
┌─────────────────────────────────┐
│ yoursite.com                    │
│ (Host main form here)           │
│                                 │
│ iframe embed on partner sites   │
└──────────────────────┬──────────┘
                       │
    Partner Site 1 ────┤
    Partner Site 2 ────┤
    Partner Site 3 ────┴────→ yoursite.com/form?source=partner1
    ...
    Partner Site N
```

**Advantages:**
- Single form to maintain
- Centralized data in Supabase
- Easy A/B testing
- Lower hosting costs

**Implementation:**
```html
<!-- On partner website -->
<iframe src="https://yoursite.com/form?source=partner1&lang=es" 
        width="100%" height="800"></iframe>
```

**Option B: White-Labeled Deployment (Scale for larger partners)**
```
Partner 1: partner1.com/form (white-labeled to look like theirs)
Partner 2: partner2.com/form (different branding)
...

Each instance:
- Separate config (colors, text, branding)
- Same backend (Supabase/n8n)
- Tracked by site_source parameter
```

### 5.2 Multi-Site Tracking & ROI

Every form submission tracks:
- `site_source` - Which partner site
- `user_geo` - Where user was located
- `referral_source` - How they found the site
- `created_at` - Timestamp

**Dashboard queries:**
```sql
-- Leads per site (last 30 days)
SELECT site_source, COUNT(*) as leads, COUNT(DISTINCT user_geo) as locations
FROM clients
WHERE created_at > NOW() - INTERVAL 30 DAY
GROUP BY site_source
ORDER BY leads DESC;

-- Conversion rate per site
SELECT site_source, 
       COUNT(*) as total_leads,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as closed_deals,
       ROUND(100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*), 2) as conversion_rate
FROM clients
WHERE created_at > NOW() - INTERVAL 30 DAY
GROUP BY site_source;

-- Revenue tracking (future)
SELECT site_source, SUM(commission_amount) as total_referral_fees
FROM referrals
WHERE closed_at > NOW() - INTERVAL 30 DAY
GROUP BY site_source;
```

---

## PART 6: LEAD SCORING & PRIORITIZATION

### 6.1 Lead Score Calculation

```javascript
let leadScore = 0;

// Budget (0-30 points)
if (budget >= 500000) leadScore += 30;
else if (budget >= 250000) leadScore += 20;
else if (budget >= 100000) leadScore += 10;
else leadScore += 5;

// Pre-approval (0-25 points)
if (preapprovalStatus === 'Yes') leadScore += 25;
else if (preapprovalStatus === 'Exploring') leadScore += 10;
else leadScore += 0;

// Timeline (0-20 points)
if (timeline === 'Immediate') leadScore += 20;
else if (timeline === '1-3 Months') leadScore += 15;
else if (timeline === '3-6 Months') leadScore += 10;
else leadScore += 5;

// Client type (0-15 points)
if (clientType.includes('Investor')) leadScore += 15;
else if (clientType.includes('Buyer')) leadScore += 12;
else if (clientType.includes('Seller')) leadScore += 10;
else leadScore += 5;

// Specialty complexity (0-10 points)
if (specialty.includes('Crypto') || specialty.includes('Divorce') || specialty.includes('FC')) leadScore += 10;
else if (specialty.length > 0) leadScore += 5;

// Result: 0-100 scale
console.log(`Lead Score: ${leadScore}/100`);
```

**Benefits:**
- Flag "hot" leads (70+ score) for priority agent outreach
- Track if hot leads convert better
- Send different email templates based on score

---

## PART 7: SOCIAL MARKETING ENGINE (AI-Powered)

### 7.1 Automated Content Generation

**Idea:** Use LLMs to auto-generate and post social content from leads/agents/transactions

```
Example Automation:

1. Daily: Check for successful referrals closed in last 24h
2. For each closed deal:
   - Extract: property type, location, price, agents involved
   - Prompt LLM: "Write a celebratory LinkedIn post about a $500k Miami condo sale"
   - Generate 3 variations with different angles (investor, first-time buyer, crypto angle)
   - Post to Twitter, LinkedIn, Instagram (your branded accounts + agent accounts)

3. Weekly: Check high-performing agents
   - "Agent Maria just closed 5 deals this month!"
   - Schedule promotional posts

4. Real-time: New lead types trending?
   - "ℹ️ 60% of your leads this week are crypto investors interested in Miami"
   - Data insights post
```

**Platforms to target (free options):**
- Twitter/X (organic, no API costs)
- LinkedIn (organic network effect)
- Instagram (visual content, before/after photos)
- Facebook Groups (lead funnels to form)
- TikTok (short clips of agents, property walkthroughs)

**Implementation in n8n:**
- Scheduled workflow (daily at 9am)
- Query recent closed deals
- Prompt OpenAI API (or local LLM)
- Post to APIs (Twitter, LinkedIn, etc)

### 7.2 Lead Magnet Funnel

Create **free valuable content** to drive people to form:

1. **"Agent Match Quiz"** (landing page)
   - "What kind of agent do YOU need?" 
   - 10 questions → AI recommends agent type
   - Ends with: "Find your agent →" → form

2. **"Real Estate Glossary"** (SEO content)
   - Free PDF download
   - Email capture → nurture sequence
   - Sequence eventually links to form

3. **"How Much House Can I Afford?"** (Calculator)
   - Based on income/credit/down payment
   - Results include "See matching agents" → form

4. **"Market Report"** (Monthly data)
   - "Miami market: 500K median, 15% annual growth"
   - PDF + email list
   - Segment by city/specialty

---

## PART 8: AGENT DISCOVERY & POOL MANAGEMENT

### 8.1 Automated Agent Scraping Strategy

**Current tool:** Crawl4AI (local Docker container)

**Deployment:**
```bash
# Current: Running locally (localhost:8001)
# Next: Deploy to:
# - Railway.app (free tier, $5/month for persistent)
# - Render.com (free tier)
# - DigitalOcean (cheapest VPS, $5/month)
# - Or self-host on same server as n8n
```

### 8.2 Agent Scraping Schedule

```
Daily (9 AM UTC):
  1. For each region (Miami, Tampa, Orlando, Jacksonville):
     - Scrape Realtor.com
     - Scrape Zillow
     - Scrape Compass
     - Scrape KW
     - Scrape eXp

  2. Deduplicate by email/phone
  
  3. Generate embeddings for new/updated agents
  
  4. Upsert into agents table
     (Update if exists, insert if new)

  5. Remove agents marked as inactive > 90 days
```

**Cost:** ~$0.20/day for API calls (very cheap)

### 8.3 Agent Profile Enrichment

```javascript
// After scraping, enrich agent data:

For each agent:
1. Extract profile image (if available)
2. Parse specialties from bio/description
3. Extract years experience
4. Get ratings (if available)
5. Identify service cities from profile
6. Detect languages (English, Spanish, etc)
7. Generate vector embedding
8. Calculate "data quality score"
   (0-100% based on completeness)
```

---

## PART 9: MONETIZATION STRATEGY

### 9.1 Revenue Streams

| Stream | How | Potential |
|--------|-----|-----------|
| **Agent Referral Fees** | Agents pay 10-25% of commission on referred deals | $500-2000/month (early) |
| **White-Label Licensing** | License form/matching to broker networks | $1000-5000/month per network |
| **Lead Monetization** | Sell hot leads to top agents (Investor/Crypto segments) | $100-300/lead |
| **Premium Agent Features** | Featured listing, priority referrals, analytics | $50-200/month per agent |
| **Data/Market Reports** | Sell anonymized market insights to brokers | TBD |

### 9.2 Current Focus

**MVP:** Prove the matching algorithm works (0 cost focus)
- Use free tier of all services
- Build agent database from scraping
- Validate that agents actually accept referrals
- Get first 10-20 successful transactions

**Then monetize:** Once you have proof of conversion

---

## PART 10: IMPLEMENTATION ROADMAP

### **Phase 1: Foundation (Week 1-2) - CRITICAL BLOCKERS**

- [ ] Populate `agents` table (web scraper)
  - Target: 500+ agents across Florida
  - Run manual scrape across 5 broker sites
  - Clean/deduplicate data

- [ ] Build embedding pipeline
  - For existing clients: generate vectors for all
  - For new clients: auto-generate on submission
  - For agents: auto-generate on discovery

- [ ] Activate main matching workflow
  - Test with 5-10 form submissions
  - Verify embeddings are calculated
  - Verify top 10 agents returned correctly
  - Verify emails sent to agents

- [ ] Fix schema gaps
  - Add `vector_embedding` columns (if not exists)
  - Add `lead_score` calculation
  - Add `status` field tracking

### **Phase 2: Automation & Workflow (Week 3-4)**

- [ ] Full n8n workflow
  - Form → Embed → Insert → Match → Notify → Follow-up
  - Test entire flow end-to-end
  - Verify all emails sending correctly

- [ ] Follow-up sequences
  - Day 3: Client check-in
  - Day 7: Agent follow-up
  - Day 14: Mark as lost/closed
  - Day 30: Feedback survey

- [ ] Agent acceptance workflow
  - Agents receive email with 1-click "Accept" button
  - Auto-create referral record on accept
  - Send client details only after acceptance

### **Phase 3: Scale to Multiple Sites (Week 5-6)**

- [ ] Deploy form to 5 partner websites
  - Or create 5 test domains
  - Ensure `site_source` tracking works
  - Verify ROI tracking per site

- [ ] Multi-language testing
  - Spanish form submission
  - Spanish agent matching
  - Multilingual email templates

### **Phase 4: Social & Growth (Week 7-8)**

- [ ] Set up social posting automation
  - Daily deal posts
  - Agent spotlights
  - Market insights

- [ ] Create lead magnets
  - Agent Match Quiz
  - Market Report PDFs
  - Mortgage Calculator

- [ ] Launch organic marketing
  - Twitter/X content plan
  - LinkedIn articles
  - Instagram agent features

### **Phase 5: Analytics & Optimization (Week 9-10)**

- [ ] Build dashboards
  - Leads per site (daily)
  - Match → Acceptance rate
  - Agent response time
  - Conversion rate

- [ ] A/B testing
  - Different email templates
  - Different form fields
  - Different site designs

- [ ] Agent quality metrics
  - Track who closes most deals
  - Track who responds fastest
  - Boost ranking of high-performers

---

## PART 11: TECHNOLOGY STACK SUMMARY

### Core Services (All Free Tier / Self-Hosted)

| Service | Purpose | Cost | Self-Host Option |
|---------|---------|------|------------------|
| Supabase | Database + Auth | Free | PostgreSQL |
| n8n | Workflow automation | Free (self-hosted) | Docker |
| Crawl4AI | Web scraping | Free | Docker (your instance) |
| Xenova | Embeddings | Free | Local ML model |
| NodeMailer | Email sending | Free | Your SMTP |
| OpenAI | LLM (optional, for content) | $5-50/month | Ollama (local) |

### Infrastructure

```
┌─────────────────────────────────────────┐
│  Partner Websites (100+)                │
│  (iFrame or white-labeled)              │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────▼──────────────┐
      │  n8n (Self-hosted)       │
      │  (Workflow Automation)   │
      └─┬──────────────────┬─────┘
        │                  │
   ┌────▼────┐      ┌─────▼─────┐
   │ Supabase │      │ Crawl4AI  │
   │(Database)│      │(Scraper)  │
   └──────────┘      └───────────┘
```

**Hosting Options (Cheapest):**
1. Supabase (Free tier: 500MB DB + 2GB bandwidth)
2. n8n Cloud (Free tier: 100 executions/month) OR Self-hosted Docker ($5-10/month VPS)
3. Crawl4AI Self-hosted on same $5-10 VPS
4. Email via Nodemailer + your Gmail/SMTP account

**Total monthly cost: $0-15** (can scale to $50-100 as you grow)

---

## PART 12: CRITICAL NEXT STEPS (DO THIS FIRST)

### Before you touch n8n:

1. **Get agents in Supabase**
   ```sql
   -- How many agents do you have?
   SELECT COUNT(*) FROM agents;
   ```
   - If < 10: BLOCKER. Run scraper now.
   - If 10-100: OK for MVP testing
   - If 100+: Good, can proceed

2. **Test embeddings locally**
   ```javascript
   // Generate embedding for a client profile
   const testProfile = "Buyer in Miami, needs crypto agent, speaks Spanish";
   const embedding = await generateEmbedding(testProfile);
   console.log(embedding); // Should be 384-dimensional array
   ```

3. **Test a form submission end-to-end**
   - Fill form on your site
   - Check Supabase `clients` table
   - Verify all fields populated
   - Verify n8n webhook received it

4. **Test the matcher workflow**
   - Run matching query manually in Supabase
   - Verify returns top 10 agents
   - Verify match scores calculated correctly

5. **Send 5 test emails**
   - To yourself pretending to be an agent
   - Verify email format/design
   - Verify all agent info correct
   - Iterate on template

---

## PART 13: DECISIONS YOU NEED TO MAKE

### Decision 1: Embedding Model
- **Local Xenova/all-MiniLM-L6-v2** (384-dim, fast, free) ← RECOMMENDED
- OpenAI API (better quality, costs money)
- Hugging Face Inference API (slower, free tier limits)

### Decision 2: Agent Sourcing
- **Web scraping** (what you have) ← Free but needs maintenance
- Manual CSV imports from brokerages
- API integrations with MLS systems

### Decision 3: Multi-Site Strategy
- **Shared iFrame on partner sites** (MVP) ← Easiest to start
- White-labeled instances per major partner
- Separate branded sites for each region

### Decision 4: Monetization Timeline
- **Prove concept first** (30-60 days, $0 spend)
- Then negotiate with first 5 agents
- Then scale to brokerages

### Decision 5: Email Service
- **Gmail SMTP** (free, 500/day limit) ← Fine for MVP
- SendGrid/Mailgun (free tier, better deliverability)
- Your own mail server

---

## SUMMARY TABLE: What Exists vs What's Missing

| Feature | Status | Effort to Complete | Priority |
|---------|--------|-------------------|----------|
| Form collection | ✅ | Done | - |
| Supabase setup | ✅ | Done | - |
| Chatbot | ✅ | Done | - |
| Embedding generation | ❌ | 2-4 hours | 🔴 CRITICAL |
| Vector matching algorithm | ⚠️ Partial | 2-4 hours | 🔴 CRITICAL |
| Automated agent matching (in workflow) | ❌ | 4-6 hours | 🔴 CRITICAL |
| Agent scraping (deployment) | ⚠️ Partial | 4-6 hours | 🔴 CRITICAL |
| Referral creation automation | ❌ | 2-4 hours | 🟡 HIGH |
| Email to agents | ❌ | 2-4 hours | 🟡 HIGH |
| Multi-site deployment | ⚠️ Partial | 6-8 hours | 🟡 HIGH |
| Follow-up sequences | ❌ | 4-6 hours | 🟡 HIGH |
| Analytics dashboard | ❌ | 8-12 hours | 🟠 MEDIUM |
| Social automation | ❌ | 8-12 hours | 🟠 MEDIUM |
| Lead scoring | ❌ | 2-4 hours | 🟠 MEDIUM |

---

## FINAL RECOMMENDATION

### Start Here (This Week):

1. **Populate agents table** (2 hours)
   - Run scraper against Compass, KW, eXp for Miami
   - Aim for 200+ agents
   - Clean/deduplicate

2. **Build embedding pipeline** (4 hours)
   - Create n8n workflow to generate embeddings
   - Test on 10 sample agents + 10 sample clients
   - Verify vectors are 384 dimensions and saved

3. **Test vector matching** (2 hours)
   - Write SQL query to find similar agents by vector distance
   - Test with sample client
   - Verify top 10 returns reasonable results

4. **Integrate into main workflow** (4 hours)
   - Add embedding generation to form submission workflow
   - Add agent matching query after client insert
   - Create referral records for top 10

5. **Test full flow** (2 hours)
   - Submit test form
   - Verify all steps complete
   - Check emails sent correctly

**Total: ~14 hours of focused work over 3-5 days**

Then you have a working MVP that can run 100s of sites + handle automated AI matching. No more manual work after that.

---

## Questions to Guide Implementation

- [ ] What's your target number of agents at launch? (100? 500? 1000?)
- [ ] Which Florida cities/regions are priority? (Miami, Tampa, Orlando, all?)
- [ ] Will partners pay upfront, or revenue-share based on referrals?
- [ ] Should agents accept/reject before client sees them, or always get contact?
- [ ] What's your target commission split with agents?
- [ ] Which email provider (Gmail, SendGrid, Mailgun)?
- [ ] Want to include video chat integration later? (Calendly, Jitsi?)

---

**This plan is your north star. Each phase builds on the last. Start Phase 1 this week.**

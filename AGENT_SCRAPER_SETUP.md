# Agent Scraper Workflow Setup Guide

## Overview

This setup adds an agent scraper workflow to your existing n8n client form workflow. When a client submits their form, the system will:

1. Insert the client (existing workflow)
2. Send confirmation emails (existing workflow)  
3. **NEW**: Scrape broker websites for matching agents
4. **NEW**: Rank and dedupe agents
5. **NEW**: Save top 10 agents to Supabase
6. **NEW**: Create referrals linking client to agents

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXISTING WORKFLOW                           │
│  Webhook → Prepare Data → Embedding → Insert Client → Emails   │
│                                              │                  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEW: AGENT SCRAPER                          │
│  Crawl4AI → Rank/Dedupe → Embeddings → Upsert Agents → Referrals│
└─────────────────────────────────────────────────────────────────┘
```

## Files Created

| File                              | Purpose                           |
| --------------------------------- | --------------------------------- |
| `crawl4ai-api/Dockerfile`         | Docker image for web scraping API |
| `crawl4ai-api/requirements.txt`   | Python dependencies               |
| `crawl4ai-api/app.py`             | FastAPI scraping service          |
| `n8n-agent-scraper-workflow.json` | n8n workflow to import            |
| `n8n-chain-node.json`             | Node to add to existing workflow  |

## Setup Steps

### Step 1: Crawl4AI Container (Already Running)

The container is running on port 8001:
```bash
# Check status
docker ps | grep crawl4ai

# Health check
curl http://localhost:8001/health

# Test scraping
curl -X POST http://localhost:8001/scrape-agents \
  -H "Content-Type: application/json" \
  -d '{"site": "compass", "location": "Miami, FL"}'
```

### Step 2: Expose Crawl4AI to n8n Cloud

Since your n8n is hosted on n8n.cloud, you need to expose the local Crawl4AI container:

**Option A: Use ngrok (recommended for testing)**
```bash
ngrok http 8001
# Note the https://xxx.ngrok.io URL
```

**Option B: Deploy Crawl4AI to a cloud server**
- Use Railway, Render, or DigitalOcean
- Update the workflow URL to your deployed endpoint

### Step 3: Import the Agent Scraper Workflow

1. Open n8n at https://baloo8721.app.n8n.cloud
2. Click **Add workflow** → **Import from File**
3. Select `n8n-agent-scraper-workflow.json`
4. Configure:
   - Update the Crawl4AI URL to your ngrok/deployed URL
   - Add your Supabase credentials to the Supabase nodes
5. **Activate** the workflow

### Step 4: Chain to Existing Workflow

Add this node to your existing "Agent Matcher - Find Top 10 Agents for Client" workflow:

1. Open the existing workflow
2. Add an **HTTP Request** node
3. Configure:
   - Method: `POST`
   - URL: `https://baloo8721.app.n8n.cloud/webhook/scrape-agents`
   - Body: `{{ JSON.stringify($json) }}`
4. Connect it to the **Insert Client** node output (parallel to emails)

## API Endpoints

### Crawl4AI Service (localhost:8001)

| Endpoint                  | Method | Description                  |
| ------------------------- | ------ | ---------------------------- |
| `/health`                 | GET    | Health check                 |
| `/scrape`                 | POST   | Generic page scraping        |
| `/scrape-agents`          | POST   | Single site agent scraping   |
| `/scrape-agents-parallel` | POST   | Multi-site parallel scraping |

### Example Requests

**Single Site:**
```json
POST /scrape-agents
{
  "site": "realtor",
  "location": "Miami, FL",
  "specialty": "luxury",
  "language": "English"
}
```

**Parallel Scraping:**
```json
POST /scrape-agents-parallel
{
  "sites": ["realtor", "zillow", "redfin", "compass", "kw"],
  "location": "Miami, FL",
  "specialty": "luxury"
}
```

## Supported Broker Sites

| Site      | URL Pattern                                 | Notes                       |
| --------- | ------------------------------------------- | --------------------------- |
| realtor   | realtor.com/realestateagents/{city}_{state} | May require anti-bot bypass |
| zillow    | zillow.com/professionals/{city}-{state}/    | Heavy JS rendering          |
| redfin    | redfin.com/city/{city}/real-estate/agents   | May be blocked              |
| compass   | compass.com/agents/{city}-{state}/          | ✅ Works well                |
| kw        | kw.com/agents?location={location}           | Needs testing               |
| remax     | remax.com/real-estate-agents/{location}     | Needs testing               |
| coldwell  | coldwellbanker.com/agents/{location}        | Needs testing               |
| century21 | century21.com/real-estate-agents/{location} | Needs testing               |
| sothebys  | sothebysrealty.com/eng/associates           | Needs testing               |
| exp       | exprealty.com/agents/?location={location}   | Needs testing               |

## Known Limitations

1. **Anti-bot Protection**: Many real estate sites block scrapers. The scraper uses Playwright with stealth settings, but some sites may still block.

2. **Dynamic Content**: Sites that load agents via infinite scroll or lazy loading may return incomplete results.

3. **CSS Selectors**: Each site has unique HTML structure. Selectors may need tuning for each site.

## Recommendations for Production

For more reliable agent discovery, consider:

1. **SerpAPI** - Google search API that returns structured data
2. **Data providers** - Services like DataFetch, Proxycurl for real estate data
3. **Direct APIs** - Some brokerages have public APIs

## Troubleshooting

**Container won't start:**
```bash
docker logs crawl4ai-api
```

**Scraping returns 0 agents:**
- Check if site is blocking (try different user agent)
- CSS selectors may need updating for that site
- Try `/scrape` endpoint to see raw HTML

**n8n can't reach Crawl4AI:**
- Ensure ngrok is running (if using cloud n8n)
- Check firewall settings
- Verify URL in workflow

## Workflow Flow

```
1. Client Form Submitted
   ↓
2. [Existing] Insert Client + Send Emails
   ↓
3. [New] Trigger Agent Scraper via Webhook
   ↓
4. Set Search Parameters (location, language, specialty)
   ↓
5. Crawl4AI Parallel Scrape (5 broker sites)
   ↓
6. Rank & Dedupe → Top 10 Agents
   ↓
7. Generate Embeddings (for vector matching)
   ↓
8. Upsert to agents table
   ↓
9. Create referrals linking client → agents
   ↓
10. Return results
```

## Performance

- **Parallel scraping**: 5 sites scraped simultaneously
- **Expected time**: 15-30 seconds for full flow
- **Optimization tip**: Reduce to 3 most reliable sites for faster results

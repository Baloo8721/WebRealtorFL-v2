import express from 'express';
import { generateEmbedding } from './embedder.js';
import { scrapeAgents } from './scraper.js';
import { sendReferralEmails } from './mailer.js';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Generate embedding endpoint (called by Edge Function)
app.post('/api/embed', async (req, res) => {
  try {
    const { text } = req.body;
    const embedding = await generateEmbedding(text);
    res.json({ embedding });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual scrape trigger
app.post('/api/scrape', async (req, res) => {
  try {
    const { city, state } = req.body;
    const agents = await scrapeAgents(city, state);
    res.json({ success: true, count: agents.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send emails endpoint
app.post('/api/send-emails', async (req, res) => {
  try {
    const { client, agents } = req.body;
    await sendReferralEmails(client, agents);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule nightly scraping at 2am
cron.schedule('0 2 * * *', async () => {
  console.log('Starting nightly agent scrape...');
  // Scrape major FL cities
  const cities = ['Miami', 'Orlando', 'Tampa', 'Jacksonville'];
  for (const city of cities) {
    try {
      await scrapeAgents(city, 'FL');
    } catch (error) {
      console.error(`Error scraping ${city}:`, error);
    }
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

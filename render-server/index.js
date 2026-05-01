import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Form submission endpoint (standalone - no heavy dependencies)
app.post('/api/submit', async (req, res) => {
  try {
    const formData = req.body;
    console.log('Form submission received:', formData);
    
    // For now, just log the data and return success
    // TODO: Add actual processing logic (save to database, send emails, etc.)
    res.json({ 
      success: true, 
      message: 'Form submitted successfully',
      received: formData 
    });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Other endpoints (only load if environment variables are set)
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  try {
    const { generateEmbedding } = await import('./embedder.js');
    const { scrapeAgents } = await import('./scraper.js');
    const { sendReferralEmails } = await import('./mailer.js');
    const cron = (await import('node-cron')).default;

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
      const cities = ['Miami', 'Orlando', 'Tampa', 'Jacksonville'];
      for (const city of cities) {
        try {
          await scrapeAgents(city, 'FL');
        } catch (error) {
          console.error(`Error scraping ${city}:`, error);
        }
      }
    });

    console.log('✅ Heavy dependencies loaded (Supabase, Playwright, etc.)');
  } catch (error) {
    console.error('⚠️ Failed to load heavy dependencies:', error.message);
    console.log('⚠️ Running in lightweight mode - only /api/submit available');
  }
} else {
  console.log('⚠️ SUPABASE_URL not set - running in lightweight mode');
  console.log('⚠️ Only /api/submit endpoint available');
}

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

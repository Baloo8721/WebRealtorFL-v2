import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function scrapeAgents(city, state = 'FL') {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to Realtor.com agent directory
  await page.goto(`https://www.realtor.com/realestateagents/${city.toLowerCase()}_${state.toLowerCase()}`);
  
  // Wait for agent listings to load
  await page.waitForSelector('.agent-card');
  
  const agents = await page.evaluate(() => {
    const cards = document.querySelectorAll('.agent-card');
    return Array.from(cards).slice(0, 10).map(card => ({
      name: card.querySelector('.agent-name')?.textContent?.trim(),
      email: card.querySelector('.agent-email')?.textContent?.trim(),
      phone: card.querySelector('.agent-phone')?.textContent?.trim(),
      brokerage: card.querySelector('.brokerage-name')?.textContent?.trim(),
      service_cities: [city],
      service_states: [state],
      specialties: ['General Real Estate'],
      languages: ['English'],
      is_active: true
    }));
  });
  
  await browser.close();
  
  // Save to Supabase with deduplication
  for (const agent of agents) {
    if (!agent.name || !agent.email) continue;
    
    // Check if agent already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('email', agent.email)
      .single();
    
    if (!existing) {
      await supabase.from('agents').insert(agent);
    }
  }
  
  return agents;
}

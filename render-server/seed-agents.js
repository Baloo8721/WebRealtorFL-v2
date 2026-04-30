import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, agentToText } from './embedder.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const testAgents = [
  {
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    phone: '305-555-0101',
    brokerage: 'Miami Elite Realty',
    service_cities: ['Miami', 'Miami Beach', 'Coral Gables'],
    service_states: ['FL'],
    specialties: ['First-Time Buyer', 'Luxury', 'Spanish Speaking'],
    languages: ['English', 'Spanish'],
    is_active: true
  },
  {
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    phone: '407-555-0202',
    brokerage: 'Orlando Property Group',
    service_cities: ['Orlando', 'Winter Park', 'Kissimmee'],
    service_states: ['FL'],
    specialties: ['Investment Properties', 'Commercial', 'Property Management'],
    languages: ['English'],
    is_active: true
  },
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    phone: '813-555-0303',
    brokerage: 'Tampa Bay Premier',
    service_cities: ['Tampa', 'St. Petersburg', 'Clearwater'],
    service_states: ['FL'],
    specialties: ['Luxury', 'Waterfront', 'New Construction'],
    languages: ['English', 'Mandarin'],
    is_active: true
  },
  {
    name: 'Robert Martinez',
    email: 'robert.martinez@example.com',
    phone: '904-555-0404',
    brokerage: 'Jacksonville First Realty',
    service_cities: ['Jacksonville', 'Atlantic Beach', 'Neptune Beach'],
    service_states: ['FL'],
    specialties: ['Military', 'VA Loans', 'First-Time Buyer'],
    languages: ['English', 'Spanish'],
    is_active: true
  },
  {
    name: 'Emily Thompson',
    email: 'emily.thompson@example.com',
    phone: '561-555-0505',
    brokerage: 'Palm Beach Luxury',
    service_cities: ['West Palm Beach', 'Boca Raton', 'Delray Beach'],
    service_states: ['FL'],
    specialties: ['Luxury', 'Waterfront', 'International'],
    languages: ['English', 'French'],
    is_active: true
  }
];

async function seedAgents() {
  console.log('Seeding test agents...');
  
  for (const agent of testAgents) {
    // Check if exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('email', agent.email)
      .single();
    
    if (existing) {
      console.log(`Agent ${agent.name} already exists, skipping...`);
      continue;
    }
    
    // Generate embedding
    const text = agentToText(agent);
    const embedding = await generateEmbedding(text);
    
    // Insert with embedding
    await supabase.from('agents').insert({
      ...agent,
      embedding: `[${embedding.join(',')}]`
    });
    
    console.log(`✅ Added ${agent.name} with embedding`);
  }
  
  console.log('Done!');
}

seedAgents().catch(console.error);

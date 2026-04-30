import { pipeline } from '@xenova/transformers';

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

export async function generateEmbedding(text) {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function clientToText(client) {
  return [
    client.client_types?.join(' '),
    client.desired_city,
    client.preferred_language,
    client.agent_specialties?.join(' '),
    client.property_types?.join(' '),
    client.additional_notes || ''
  ].filter(Boolean).join(' ');
}

export function agentToText(agent) {
  return [
    agent.service_cities?.join(' '),
    agent.service_states?.join(' '),
    agent.languages?.join(' '),
    agent.specialties?.join(' '),
    agent.brokerage || ''
  ].filter(Boolean).join(' ');
}

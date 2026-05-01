import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('DB_URL')!
const supabaseServiceKey = Deno.env.get('DB_SERVICE_KEY')!
const renderServerUrl = Deno.env.get('RENDER_SERVER_URL')!
const edgeFunctionSecret = Deno.env.get('EDGE_FUNCTION_SECRET')!

serve(async (req) => {
  // Verify secret
  const authHeader = req.headers.get('x-edge-function-secret')
  if (authHeader !== edgeFunctionSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const client = await req.json()
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // 1. Generate embedding via Render server
    const text = [
      client.client_types?.join(' '),
      client.desired_city,
      client.preferred_language,
      client.agent_specialties?.join(' '),
      client.property_types?.join(' ')
    ].filter(Boolean).join(' ')
    
    const embedRes = await fetch(`${renderServerUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    const { embedding } = await embedRes.json()
    
    // 2. Save client with embedding
    const { data: savedClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: client.name,
        email: client.email,
        phone: client.phone,
        desired_city: client.desired_city,
        preferred_language: client.preferred_language,
        agent_specialties: client.agent_specialties,
        property_types: client.property_types,
        budget: client.budget,
        source_website: client.source_website,
        user_geo: client.user_geo,
        embedding: `[${embedding.join(',')}]`
      })
      .select()
      .single()
    
    if (clientError) throw clientError
    
    // 3. Find matching agents
    const { data: agents } = await supabase.rpc('match_agents', {
      query_embedding: `[${embedding.join(',')}]`,
      desired_city: client.desired_city,
      required_specialties: client.agent_specialties,
      preferred_language: client.preferred_language,
      match_count: 10
    })
    
    // 4. Create referral records
    for (const agent of agents) {
      await supabase.from('referrals').insert({
        client_id: savedClient.id,
        agent_id: agent.id,
        status: 'pending',
        match_score: agent.similarity
      })
    }
    
    // 5. Send emails via Render server
    await fetch(`${renderServerUrl}/api/send-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client, agents })
    })
    
    return new Response(JSON.stringify({ 
      success: true, 
      matchedCount: agents.length 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

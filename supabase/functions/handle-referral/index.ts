import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('DB_URL')!
const supabaseServiceKey = Deno.env.get('DB_SERVICE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!

// Simple embedding function - generates a basic vector from text
function generateEmbedding(text: string): number[] {
  // Hash-based embedding: create 1024-dim vector from text tokens
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Array(1024).fill(0)
  
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const idx = Math.abs(word.charCodeAt(i) * (i + 1)) % 1024
      embedding[idx] += 0.01
    }
  }
  
  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / norm
    }
  }
  
  return embedding
}

serve(async (req) => {
  try {
    const client = await req.json()
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // 1. Generate embedding internally (no Render dep)
    const text = [
      client.client_types?.join(' '),
      client.desired_city,
      client.preferred_language,
      client.agent_specialties?.join(' '),
      client.property_types?.join(' ')
    ].filter(Boolean).join(' ')
    
    const embedding = generateEmbedding(text)
    
    // 2. Save client with embedding directly to Supabase
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
    
    console.log('Client saved:', savedClient.id)
    
    // 3. Find matching agents via RPC
    const { data: agents, error: agentsError } = await supabase.rpc('match_agents', {
      query_embedding: `[${embedding.join(',')}]`,
      desired_city: client.desired_city,
      required_specialties: client.agent_specialties,
      preferred_language: client.preferred_language,
      match_count: 10
    })
    
    if (agentsError) throw agentsError
    
    console.log('Matched agents:', agents?.length || 0)
    
    // 4. Create referral records
    const referralRecords = []
    for (const agent of agents) {
      const referral = await supabase.from('referrals').insert({
        client_id: savedClient.id,
        agent_id: agent.id,
        status: 'pending',
        match_score: agent.similarity,
        vector_similarity: agent.similarity,
        specialty_match: true,
        language_match: client.preferred_language === agent.languages?.[0],
        location_match: agent.service_cities?.includes(client.desired_city)
      }).select()
      
      referralRecords.push(referral)
    }
    
    // 5. Send emails directly via Resend (no Render dep)
    const emailsSent = []
    for (const agent of agents) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Web3RealtorFL <onboarding@resend.dev>',
          to: [agent.email],
          subject: `New Match! ${client.name} needs a ${client.agent_specialties?.[0] || 'realtor'} in ${client.desired_city}`,
          html: `
            <h2>New Client Match</h2>
            <p><strong>Name:</strong> ${client.name}</p>
            <p><strong>Email:</strong> ${client.email}</p>
            <p><strong>Phone:</strong> ${client.phone}</p>
            <p><strong>Looking for:</strong> ${client.agent_specialties?.[0] || 'a realtor'}</p>
            <p><strong>City:</strong> ${client.desired_city}</p>
            <p><strong>Match Score:</strong> ${(agent.similarity * 100).toFixed(0)}%</p>
            <hr>
            <p>You received this match because you are the #${agents.indexOf(agent) + 1} best match for this client.</p>
          `
        })
      })
      
      const emailResult = await emailRes.json()
      emailsSent.push({ agent: agent.email, success: emailRes.ok })
      
      // Log email
      await supabase.from('email_logs').insert({
        referral_id: referralRecords[agents.indexOf(agent)]?.data?.[0]?.id,
        email_type: 'match_notification',
        recipient_email: agent.email,
        subject: `New Match: ${client.name}`,
        status: emailRes.ok ? 'sent' : 'failed',
        sent_at: new Date().toISOString()
      })
    }
    
    return new Response(JSON.stringify({
      success: true,
      matchedCount: agents?.length || 0,
      emailsSent,
      clientId: savedClient.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error in handle-referral:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

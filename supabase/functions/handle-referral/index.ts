import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!

// Simple embedding function - generates a basic vector from text
function generateEmbedding(text: string): number[] {
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
    
    // 1. Generate embedding from client data
    const text = [
      client.preferred_language || '',
      client.desired_city || '',
      ...(client.agent_specialties || []),
      ...(client.client_types || [])
    ].filter(Boolean).join(' ')
    
    const embedding = generateEmbedding(text)
    
    // 2. Save client to Supabase
    const { data: savedClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name: client.name,
        email: client.email,
        phone: client.phone,
        desired_city: client.desired_city,
        preferred_language: client.preferred_language,
        agent_specialties: client.agent_specialties,
        client_types: client.client_types,
        property_types: client.property_types,
        budget_amount: client.budget,
        timeline: client.timeline,
        additional_notes: client.additional_notes || '',
        source_website: client.source_website || 'unknown',
        user_geo: client.user_geo || '',
        embedding: `[${embedding.join(',')}]`
      })
      .select()
      .single()
    
    if (clientError) throw clientError
    
    console.log('Client saved:', savedClient.id)
    
    // 3. Find matching agents via RPC
    const { data: matchedAgents, error: agentsError } = await supabase.rpc('match_agents', {
      query_embedding: `[${embedding.join(',')}]`,
      desired_city: client.desired_city,
      required_specialties: client.agent_specialties,
      preferred_language: client.preferred_language,
      match_count: 3
    })
    
    if (agentsError) throw agentsError
    
    console.log('Matched agents:', matchedAgents?.length || 0)
    
    // 4. Create referral records
    const referralIds: string[] = []
    for (const agent of (matchedAgents || [])) {
      const { data: referral } = await supabase.from('referrals').insert({
        client_id: savedClient.id,
        agent_id: agent.id,
        status: 'pending',
        match_score: agent.similarity
      }).select().single()
      
      if (referral) {
        referralIds.push(referral.id)
      }
    }
    
    // 5. Send emails via Resend
    const emailsSent = []
    for (const agent of (matchedAgents || [])) {
      const agentName = agent.name || 'Agent'
      const emails = [agent.email, client.email, 'tylerbelislefl@gmail.com']
      const subject = `New Match: ${client.name} needs a ${client.agent_specialties?.[0] || 'realtor'}`
      const html = `
        <h2>New Client Match</h2>
        <p><strong>Name:</strong> ${client.name}</p>
        <p><strong>Email:</strong> ${client.email}</p>
        <p><strong>Phone:</strong> ${client.phone}</p>
        <p><strong>Looking for:</strong> ${client.agent_specialties?.join(', ') || a realtor'}</p>
        <p><strong>City:</strong> ${client.desired_city}</p>
        <p><strong>Budget:</strong> $${client.budget || 'N/A'}</p>
        <p><strong>Match Score:</strong> ${(agent.similarity * 100).toFixed(0)}%</p>
        <hr>
        <p>Rank #${(matchedAgents || []).indexOf(agent) + 1} of ${(matchedAgents || []).length} matches.</p>
      `
      
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Web3RealtorFL <onboarding@resend.dev>',
          to: emails,
          subject,
          html
        })
      })
      
      const emailResult = await emailRes.json()
      emailsSent.push({ agent: agent.email, success: emailRes.ok })
      
      // Log email
      for (const refId of referralIds) {
        await supabase.from('email_logs').insert({
          referral_id: refId,
          email_type: 'match_notification',
          recipient_email: agent.email,
          subject,
          status: emailRes.ok ? 'sent' : 'failed',
          sent_at: new Date().toISOString()
        })
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      clientId: savedClient.id,
      matchedCount: (matchedAgents || []).length,
      emailsSent,
      referralIds
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

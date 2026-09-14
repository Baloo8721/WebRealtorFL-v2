import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!

function generateEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Array(1024).fill(0)
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const idx = Math.abs(word.charCodeAt(i) * (i + 1)) % 1024
      embedding[idx] += 0.01
    }
  }
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) embedding[i] = embedding[i] / norm
  }
  return embedding
}

function normalizeSpecialties(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim())
  if (typeof raw === 'string') {
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

serve(async (req) => {
  try {
    const data = await req.json()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Map form fields to DB columns
    // Form sends: name, email, phone, currentLocation, desiredLocation, budget_btc, specialty(x10), timeline, preapproval, preapprovalAmount, site_source, preferred_language, user_geo
    const name = data.name || data.Name || ''
    const email = data.email || data.Email || ''
    const phone = data.phone || data.Phone || ''
    const current_city = data.currentLocation || data.current_city || data.currentCity || ''
    const desired_city = data.desiredLocation || data.desired_city || data.desiredCity || ''
    
    // Collect ALL specialty fields
    const specialties = normalizeSpecialties(data.specialty || data.agent_specialties || data.Specialty || [])
    
    // Collect client types from other fields
    const client_types: string[] = []
    if (data.preapproval && data.preapproval !== 'false') client_types.push(data.preapproval)
    if (data.client && !specialties.includes(data.client)) client_types.push(data.client)
    if (client_types.length === 0) client_types.push('buyer') // default
    
    const property_types: string[] = []
    if (data.propertyType) property_types.push(data.propertyType)
    
    // Budget
    const budget = data.budget || data.budgetAmount || data.Budget || null
    const budget_btc = data.budget_btc || data.BudgetBtc || ''
    
    // Language
    const preferred_language = data.preferred_language || data.PreferredLanguage || 'en'
    
    console.log('Input:', JSON.stringify({ name, email, desired_city, specialties, client_types }))

    // 1. Generate embedding
    const text = [preferred_language, desired_city, ...specialties, ...client_types].filter(Boolean).join(' ')
    const embedding = generateEmbedding(text)

    // 2. Save client to Supabase clients table
    const { data: savedClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        name,
        email,
        phone,
        desired_city: desired_city || current_city,
        current_city,
        preferred_language,
        client_types,
        agent_specialties: specialties,
        property_types,
        budget_amount: budget,
        timeline: data.timeline || data.Timeline || null,
        additional_notes: data.additional_notes || data.AdditionalNotes || '',
        source_website: data.site_source || data.source_website || 'unknown',
        user_geo,
        embedding: `[${embedding.join(',')}]`
      })
      .select()
      .single()

    if (clientError) throw clientError
    console.log('Client saved:', savedClient.id)

    // 3. Find matching agents via RPC
    const { data: matchedAgents, error: agentsError } = await supabase.rpc('match_agents', {
      query_embedding: `[${embedding.join(',')}]`,
      desired_city,
      required_specialties: specialties,
      preferred_language,
      match_count: 3
    })

    if (agentsError) throw agentsError
    console.log('Matched agents:', matchedAgents?.length || 0)

    // 4. Create referral records for each matched agent
    const referralIds: string[] = []
    for (const agent of (matchedAgents || [])) {
      const { data: referral } = await supabase
        .from('referrals')
        .insert({
          client_id: savedClient.id,
          agent_id: agent.id,
          status: 'pending',
          match_score: agent.similarity,
          client_specialties: specialties,
          agent_specialties: agent.specialties
        })
        .select('*')
        .single()

      if (referral) referralIds.push(referral.id)
    }

    // 5. Send emails to each matched agent + client + admin
    const emailsSent = []
    const adminEmail = 'tylerbelislefl@gmail.com'
    
    for (let i = 0; i < (matchedAgents || []).length; i++) {
      const agent = matchedAgents[i]
      const agentName = agent.name || 'Agent'
      const agentEmail = agent.email
      
      const subject = `New Match #${i+1}: ${name} needs a ${specialties[0] || 'realtor'} in ${desired_city}`
      
      const html = `
        <h2 style="color:#e74c3c;">New Client Match</h2>
        <p><strong>Rank #${i+1} of ${(matchedAgents || []).length} matches</strong></p>
        <hr>
        <p><strong>Client:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Looking for:</strong> ${specialties.join(', ') || 'a realtor'}</p>
        <p><strong>City:</strong> ${desired_city}</p>
        <p><strong>Budget:</strong> $${budget || 'Not specified'}</p>
        <p><strong>Match Score:</strong> ${(agent.similarity * 100).toFixed(0)}%</p>
        <hr>
        <p><a href="https://webrealtorfl.com/accept?ref=${savedClient.id}&agent=${agent.id}" style="background:#e74c3c;color:#fff;padding:10px 20px;text-decoration:none;display:inline-block;border-radius:4px;">Accept This Client</a></p>
        <p><a href="https://webrealtorfl.com/decline?ref=${savedClient.id}&agent=${agent.id}" style="color:#666;padding:10px 20px;text-decoration:none;display:inline-block;">Decline (72hr)</a></p>
        <br>
        <p><em>Matched by Web3RealtorFL automated matching engine</em></p>
      `
      
      // Send to agent + client + admin
      const recipients = [agentEmail, email, adminEmail].filter(Boolean)
      
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Web3RealtorFL <onboarding@resend.dev>',
          to: recipients,
          subject,
          html
        })
      })
      
      const emailBody = await emailRes.json().catch(() => ({}))
      emailsSent.push({
        agent: agentEmail,
        success: emailRes.ok,
        emailId: emailBody?.id
      })
      
      // Log each email sent (agent, client, admin)
      for (const refId of referralIds) {
        for (const recipient of recipients) {
          await supabase.from('email_logs').insert({
            referral_id: refId,
            email_type: 'match_notification',
            recipient_email: recipient,
            subject,
            status: emailRes.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString()
          })
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      clientId: savedClient.id,
      matchedCount: (matchedAgents || []).length,
      referralIds,
      emailsSent
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

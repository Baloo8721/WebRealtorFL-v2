
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const HF_TOKEN = Deno.env.get('HF_TOKEN') || ''

serve(async (req) => {
  const { text, model = 'sentence-transformers/all-Multi-Lang-LM-FNLT5-109M' } = await req.json()
  
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}/pipeline/embedding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HF_TOKEN}`
        },
        body: JSON.stringify({ inputs: text })
      }
    )
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: response.statusText, model }), { status: response.status })
    }
    
    const data = await response.json()
    
    // Extract embedding from response
    let embedding
    if (Array.isArray(data)) {
      embedding = data[0] || data
    } else if (Array.isArray(data.embedding)) {
      embedding = data.embedding
    } else {
      embedding = data
    }
    
    return new Response(JSON.stringify({ success: true, embedding, dimensions: embedding.length }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

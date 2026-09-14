
import { serve } from 'https://esm.sh/@supabase/functions-js/edge-runtime'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { sql } = await req.json()
  if (!sql) return new Response(JSON.stringify({error: 'SQL required'}), {status: 400, headers: {'Content-Type': 'application/json', ...corsHeaders}})
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY')
  const res = await fetch(supabaseUrl + '/rest/v1/?sql=' + encodeURIComponent(sql), {
    headers: {'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey, 'Content-Type': 'application/json'},
    method: 'POST'
  })
  return new Response(JSON.stringify({success: res.ok, data: res.ok ? await res.json() : null, error: !res.ok ? await res.text() : null}), {status: res.status, headers: {'Content-Type': 'application/json', ...corsHeaders}})
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// Gera hash SHA-256 da chave
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Valida a chave de API (somente system keys - tenant_id = null)
async function validateSystemApiKey(supabase: ReturnType<typeof createClient>, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey) {
    return { valid: false, error: 'Missing x-agent-key header' }
  }

  const keyHash = await hashKey(apiKey)

  const { data: keyRecord, error } = await supabase
    .from('agent_api_keys')
    .select('id, tenant_id, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRecord) {
    return { valid: false, error: 'Invalid API key' }
  }

  // Somente chaves de sistema (tenant_id = null) podem marcar lembretes
  if (keyRecord.tenant_id !== null) {
    return { valid: false, error: 'API key must be a system key (not tenant-specific)' }
  }

  if (!keyRecord.is_active) {
    return { valid: false, error: 'API key is inactive' }
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' }
  }

  // Atualiza last_used_at em background
  supabase
    .from('agent_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {})

  return { valid: true }
}

// Valida formato UUID
function isValidUUID(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return regex.test(str)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate API key
    const apiKey = req.headers.get('x-agent-key')
    const keyValidation = await validateSystemApiKey(supabase, apiKey || '')
    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized', message: keyValidation.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body: { appointment_id?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { appointment_id } = body

    // Validate appointment_id
    if (!appointment_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: appointment_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidUUID(appointment_id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid appointment_id format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if appointment exists
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, reminder_sent_at')
      .eq('id', appointment_id)
      .single()

    if (fetchError || !appointment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already marked
    if (appointment.reminder_sent_at) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Reminder was already marked as sent',
          appointment_id,
          reminder_sent_at: appointment.reminder_sent_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update reminder_sent_at
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ reminder_sent_at: now })
      .eq('id', appointment_id)

    if (updateError) {
      console.error('Error updating appointment:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Error updating appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id,
        reminder_sent_at: now
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

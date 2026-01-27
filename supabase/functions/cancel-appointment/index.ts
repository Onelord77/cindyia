import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// ============ AUTH FUNCTIONS ============

// Gera hash SHA-256 da chave
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Valida a chave de API do agente
async function validateAgentKey(supabase: ReturnType<typeof createClient>, apiKey: string, tenantId: string): Promise<{ valid: boolean; error?: string }> {
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

  if (keyRecord.tenant_id !== null && keyRecord.tenant_id !== tenantId) {
    return { valid: false, error: 'API key not authorized for this tenant' }
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

// ============ UTILITY FUNCTIONS ============

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Extrai a data (YYYY-MM-DD) de uma ISO string no timezone de São Paulo
function getDateInSaoPaulo(isoString: string): string {
  const date = new Date(isoString)
  // Ajustar UTC para São Paulo (UTC-3)
  const spTime = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return spTime.toISOString().split('T')[0]
}

// Formata horário de uma ISO string para HH:MM no timezone de São Paulo
function formatTimeInSaoPaulo(isoString: string): string {
  const date = new Date(isoString)
  // Ajustar UTC para São Paulo (UTC-3)
  const spTime = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  const hours = spTime.getUTCHours().toString().padStart(2, '0')
  const minutes = spTime.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    const { tenantId, appointmentId, reason } = body

    // ============ VALIDATION ============

    // 1. Required fields
    if (!tenantId || !appointmentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: tenantId, appointmentId'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. UUID validation
    if (!isValidUUID(tenantId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid tenantId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidUUID(appointmentId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid appointmentId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SUPABASE CLIENT ============

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ============ API KEY VALIDATION ============

    const agentKey = req.headers.get('x-agent-key')
    const keyValidation = await validateAgentKey(supabase, agentKey || '', tenantId)
    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized', message: keyValidation.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ FETCH APPOINTMENT ============

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        employees (id, name),
        services (id, name, duration, price),
        clients (id, name, phone)
      `)
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Status validation - cannot cancel completed/cancelled/no_show
    const nonCancellableStatuses = ['completed', 'cancelled', 'no_show']
    if (nonCancellableStatuses.includes(appointment.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot cancel appointment with status: ${appointment.status}`
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ UPDATE APPOINTMENT ============

    // Build notes with cancellation reason
    let updatedNotes = appointment.notes || ''
    if (reason) {
      const timestamp = new Date().toISOString()
      const cancellationNote = `[Cancelado em ${timestamp}] Motivo: ${reason}`
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\n${cancellationNote}`
        : cancellationNote
    }

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error cancelling appointment:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to cancel appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SUCCESS RESPONSE ============

    // Extract date and time from scheduled_at in São Paulo timezone
    const date = getDateInSaoPaulo(appointment.scheduled_at)
    const time = formatTimeInSaoPaulo(appointment.scheduled_at)

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: updatedAppointment.id,
          scheduledAt: appointment.scheduled_at,
          date,
          time,
          status: 'cancelled',
          previousStatus: appointment.status,
          reason: reason || null,
          cancelledAt: new Date().toISOString(),
          professional: appointment.employees ? {
            id: appointment.employees.id,
            name: appointment.employees.name
          } : null,
          client: appointment.clients ? {
            id: appointment.clients.id,
            name: appointment.clients.name,
            phone: appointment.clients.phone
          } : null,
          service: appointment.services ? {
            id: appointment.services.id,
            name: appointment.services.name,
            duration: appointment.services.duration,
            price: appointment.services.price
          } : null
        },
        message: 'Agendamento cancelado com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

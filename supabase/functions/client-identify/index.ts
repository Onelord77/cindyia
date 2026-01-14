import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

// Normaliza telefone para formato E.164 brasileiro
function normalizePhone(phone: string): string {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '')
  
  // Se começar com 55 e tiver 12-13 dígitos, já está no formato correto
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return `+${cleaned}`
  }
  
  // Se tiver 10-11 dígitos (DDD + número), adiciona 55
  if (cleaned.length >= 10 && cleaned.length <= 11) {
    return `+55${cleaned}`
  }
  
  // Retorna com + se não tiver
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Apenas GET é permitido
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obter parâmetros da URL
    const url = new URL(req.url)
    const phone = url.searchParams.get('phone')
    const tenantId = url.searchParams.get('tenantId')

    // Validar parâmetros obrigatórios
    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId parameter is required for tenant isolation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar UUID do tenant
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tenantId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tenantId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalizar telefone
    const normalizedPhone = normalizePhone(phone)
    const phoneDigitsOnly = normalizedPhone.replace(/\D/g, '')

    console.log(`[client-identify] Looking for phone: ${normalizedPhone} (digits: ${phoneDigitsOnly}) in tenant: ${tenantId}`)

    // Buscar cliente pelo telefone no tenant especificado
    // Tenta encontrar com diferentes variações do número
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('tenant_id', tenantId)
      .or(`phone.ilike.%${phoneDigitsOnly.slice(-9)}%`)
      .maybeSingle()

    if (clientError) {
      console.error('[client-identify] Error fetching client:', clientError)
      return new Response(
        JSON.stringify({ error: 'Error fetching client data', details: clientError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se não encontrou cliente
    if (!client) {
      console.log(`[client-identify] No client found for phone: ${normalizedPhone}`)
      return new Response(
        JSON.stringify({
          isClient: false,
          phone: normalizedPhone,
          message: 'No client found with this phone number'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Contar agendamentos do cliente
    const { count: appointmentsCount, error: countError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .eq('tenant_id', tenantId)

    if (countError) {
      console.error('[client-identify] Error counting appointments:', countError)
      return new Response(
        JSON.stringify({ error: 'Error counting appointments', details: countError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const totalAppointments = appointmentsCount || 0

    // Cliente deve ter >= 1 agendamento para ser considerado cliente
    if (totalAppointments < 1) {
      console.log(`[client-identify] Contact found but has no appointments: ${client.id}`)
      return new Response(
        JSON.stringify({
          isClient: false,
          phone: normalizedPhone,
          contactId: client.id,
          contactName: client.name,
          message: 'Contact exists but has no appointments (not a client yet)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar último agendamento
    const { data: lastAppointment, error: lastError } = await supabase
      .from('appointments')
      .select('scheduled_at')
      .eq('client_id', client.id)
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastError) {
      console.error('[client-identify] Error fetching last appointment:', lastError)
    }

    console.log(`[client-identify] Client identified: ${client.id} with ${totalAppointments} appointments`)

    // Retornar dados do cliente
    return new Response(
      JSON.stringify({
        isClient: true,
        clientId: client.id,
        name: client.name || null,
        phone: normalizedPhone,
        email: client.email || null,
        appointmentsCount: totalAppointments,
        lastAppointmentAt: lastAppointment?.scheduled_at || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('[client-identify] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

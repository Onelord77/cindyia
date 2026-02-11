import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

const TIMEZONE_OFFSET = '-03:00' // America/Sao_Paulo (UTC-3)

// Valida formato UUID
function isValidUUID(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return regex.test(str)
}

// Gera hash SHA-256 da chave
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Valida a chave de API do agente
// Aceita chaves de sistema (tenant_id IS NULL) ou chaves específicas do tenant
async function validateAgentKey(supabase: ReturnType<typeof createClient>, apiKey: string, tenantId: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey) {
    return { valid: false, error: 'Missing x-agent-key header' }
  }

  const keyHash = await hashKey(apiKey)

  // Busca a chave pelo hash (pode ser de sistema ou do tenant)
  const { data: keyRecord, error } = await supabase
    .from('agent_api_keys')
    .select('id, tenant_id, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRecord) {
    return { valid: false, error: 'Invalid API key' }
  }

  // Verifica se a chave é de sistema (null) ou do tenant correto
  if (keyRecord.tenant_id !== null && keyRecord.tenant_id !== tenantId) {
    return { valid: false, error: 'API key not authorized for this tenant' }
  }

  if (!keyRecord.is_active) {
    return { valid: false, error: 'API key is inactive' }
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' }
  }

  // Atualiza last_used_at em background (nao bloqueia a resposta)
  supabase
    .from('agent_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {})

  return { valid: true }
}

// Normaliza telefone para formato padrao (apenas adiciona DDI 55 se necessario)
// Nao manipula o nono digito - salva exatamente como recebido
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Adiciona DDI 55 se necessario
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits
  }

  return digits
}

// Gera variantes do telefone para busca
// Por enquanto, apenas retorna o telefone normalizado (sem manipular o 9)
function getPhoneVariants(phone: string): string[] {
  return [normalizePhone(phone)]
}

// Normaliza telefone para o formato padrao (sem manipular o 9)
function normalizePhoneToStandard(phone: string): string {
  return normalizePhone(phone)
}

// Retorna o inicio do dia atual no timezone de Sao Paulo (00:00:00 UTC-3)
function getTodayStartInSaoPaulo(): string {
  const now = new Date()
  // Ajustar UTC para Sao Paulo (UTC-3)
  const spTime = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const dateStr = spTime.toISOString().split('T')[0]
  return `${dateStr}T00:00:00${TIMEZONE_OFFSET}`
}

// Extrai a data (YYYY-MM-DD) de uma ISO string no timezone de Sao Paulo
function getDateInSaoPaulo(isoString: string): string {
  const date = new Date(isoString)
  // Ajustar UTC para Sao Paulo (UTC-3)
  const spTime = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return spTime.toISOString().split('T')[0]
}

// Formata horario de uma ISO string para HH:MM no timezone de Sao Paulo
function formatTimeInSaoPaulo(isoString: string): string {
  const date = new Date(isoString)
  // Ajustar UTC para Sao Paulo (UTC-3)
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

  // Only allow GET
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'method_not_allowed', message: 'Use GET method' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId')
    const phone = url.searchParams.get('phone')
    const clientName = url.searchParams.get('name') || '' // Optional, used only for new clients

    // Validate required parameters
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_parameter', message: "Parameter 'tenantId' is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_parameter', message: "Parameter 'phone' is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format
    if (!isValidUUID(tenantId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_format', message: 'Invalid tenantId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone has enough digits
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_phone', message: 'Phone number must have at least 10 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate API key
    const agentKey = req.headers.get('x-agent-key')
    const keyValidation = await validateAgentKey(supabase, agentKey || '', tenantId)
    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized', message: keyValidation.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get phone variants for search (handles 12 vs 13 digit formats)
    const phoneVariants = getPhoneVariants(phone)
    // Standard format for new clients (13 digits with 9)
    const standardPhone = normalizePhoneToStandard(phone)

    // Try to find existing client using any phone variant (single query with IN)
    let client: Record<string, unknown> | null = null
    let isNewClient = false

    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, name, phone, email, cpf, birth_date, address, notes, is_lead, total_visits, last_visit')
      .in('phone', phoneVariants)
      .eq('tenant_id', tenantId)

    // Use first match (preferably the one with most data)
    const existingClient = existingClients && existingClients.length > 0
      ? existingClients.sort((a, b) => (b.name ? 1 : 0) - (a.name ? 1 : 0))[0]
      : null

    if (existingClient) {
      client = existingClient
    } else {
      // Client not found - create as lead with standard phone format (13 digits)
      // Use provided name or phone number as fallback
      const nameForNewClient = clientName.trim() || phone

      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenantId,
          name: nameForNewClient,
          phone: standardPhone,
          is_lead: true,
          total_visits: 0,
        })
        .select('id, name, phone, email, cpf, birth_date, address, notes, is_lead, total_visits, last_visit')
        .single()

      if (createError || !newClient) {
        console.error('Error creating client:', createError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'create_failed',
            message: 'Erro ao criar cliente automaticamente'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      client = newClient
      isNewClient = true
    }

    // Get appointments from today onwards (>= 00:00 of current day in Sao Paulo)
    const todayStart = getTodayStartInSaoPaulo()

    // Only get active appointments (exclude cancelled and no_show)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        duration,
        status,
        payment_status,
        price,
        notes,
        employees (id, name),
        services (id, name, duration, price),
        appointment_services (
          service_id,
          employee_id,
          price,
          duration,
          sort_order,
          services:service_id (id, name, duration, price),
          employees:employee_id (id, name)
        )
      `)
      .eq('client_id', client.id)
      .eq('tenant_id', tenantId)
      .gte('scheduled_at', todayStart)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .order('scheduled_at', { ascending: true })

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return new Response(
        JSON.stringify({ success: false, error: 'internal_error', message: 'Error fetching appointments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format appointments for response
    const formattedAppointments = (appointments || []).map(apt => {
      const scheduledAt = apt.scheduled_at
      const date = getDateInSaoPaulo(scheduledAt)
      const time = formatTimeInSaoPaulo(scheduledAt)

      // Calculate end time
      const endDate = new Date(new Date(scheduledAt).getTime() + apt.duration * 60000)
      const endTime = formatTimeInSaoPaulo(endDate.toISOString())

      const aptServices = (apt as any).appointment_services as {
        service_id: string; employee_id: string; price: number; duration: number; sort_order: number;
        services?: { id: string; name: string; duration: number; price: number } | null;
        employees?: { id: string; name: string } | null;
      }[] | null

      // Build services array from appointment_services (preferred) or legacy fields
      let services: { id: string; name: string; duration: number; price: number; professional: { id: string; name: string } | null }[] = []

      if (aptServices && aptServices.length > 0) {
        services = aptServices
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map(as => ({
            id: as.services?.id || as.service_id,
            name: as.services?.name || 'Serviço',
            duration: as.duration || as.services?.duration || 0,
            price: as.price || as.services?.price || 0,
            professional: as.employees ? { id: as.employees.id, name: as.employees.name } : null
          }))
      } else if (apt.services) {
        // Fallback to legacy single service/employee
        services = [{
          id: (apt.services as any).id,
          name: (apt.services as any).name,
          duration: (apt.services as any).duration,
          price: (apt.services as any).price,
          professional: apt.employees ? { id: (apt.employees as any).id, name: (apt.employees as any).name } : null
        }]
      }

      // Unique professionals
      const professionals = [...new Map(
        services.filter(s => s.professional).map(s => [s.professional!.id, s.professional!])
      ).values()]

      return {
        id: apt.id,
        date,
        time,
        endTime,
        scheduledAt,
        duration: apt.duration,
        status: apt.status,
        paymentStatus: apt.payment_status,
        price: apt.price,
        notes: apt.notes,
        services,
        professionals
      }
    })

    const appointmentCount = formattedAppointments.length

    const message = isNewClient
      ? 'Novo cliente criado automaticamente'
      : `Cliente encontrado com ${appointmentCount} agendamento(s) futuro(s)`

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          client: {
            id: client.id,
            name: client.name,
            phone: client.phone,
            email: client.email,
            cpf: client.cpf,
            birthDate: client.birth_date,
            address: client.address,
            notes: client.notes,
            isLead: client.is_lead,
            totalVisits: client.total_visits,
            lastVisit: client.last_visit
          },
          isNewClient,
          appointments: formattedAppointments,
          appointmentCount
        },
        message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: 'internal_error', message: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

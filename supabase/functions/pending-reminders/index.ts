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

  // Somente chaves de sistema (tenant_id = null) podem listar lembretes de todos os tenants
  if (keyRecord.tenant_id !== null) {
    return { valid: false, error: 'API key must be a system key (not tenant-specific) to list all reminders' }
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

// Formata data para exibicao (DD/MM/YYYY)
function formatDateBR(isoString: string): string {
  const date = new Date(isoString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Formata horario em Sao Paulo (UTC-3)
function formatTimeInSaoPaulo(isoString: string): string {
  const date = new Date(isoString)
  // Ajustar UTC para Sao Paulo (UTC-3)
  const spTime = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  const hours = spTime.getUTCHours().toString().padStart(2, '0')
  const minutes = spTime.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

interface TenantSettings {
  notifyOnReminder?: boolean
  reminderHours?: string
}

interface ReminderItem {
  appointment_id: string
  tenant_id: string
  tenant_name: string
  client_name: string | null
  client_phone: string | null
  service_name: string
  employee_name: string
  scheduled_at: string
  formatted_date: string
  formatted_time: string
  whatsapp_token: string | null
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

    // Get all active tenants with notifyOnReminder = true
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, settings')
      .eq('status', 'active')

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Error fetching tenants' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const reminders: ReminderItem[] = []
    const now = new Date()

    for (const tenant of tenants || []) {
      const settings = (tenant.settings as TenantSettings) || {}

      // Skip if notifications disabled
      if (settings.notifyOnReminder === false) {
        continue
      }

      // Get reminder hours (default 2)
      const reminderHours = parseInt(settings.reminderHours || '2', 10)

      // Calculate window: NOW to NOW + reminderHours
      const windowEnd = new Date(now.getTime() + reminderHours * 60 * 60 * 1000)

      // Get appointments in the reminder window that haven't been sent yet
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          reminder_sent_at,
          clients!inner (
            name,
            phone
          ),
          services!inner (
            name
          ),
          employees!inner (
            name
          )
        `)
        .eq('tenant_id', tenant.id)
        .in('status', ['scheduled', 'confirmed'])
        .is('reminder_sent_at', null)
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', windowEnd.toISOString())

      if (appointmentsError) {
        console.error(`Error fetching appointments for tenant ${tenant.id}:`, appointmentsError)
        continue
      }

      if (!appointments || appointments.length === 0) {
        continue
      }

      // Get WhatsApp instance for this tenant (prefer connected one)
      const { data: whatsappInstance } = await supabase
        .from('whatsapp_instances')
        .select('instance_token, status')
        .eq('tenant_id', tenant.id)
        .eq('status', 'connected')
        .limit(1)
        .single()

      // Add reminders to the list
      for (const apt of appointments) {
        const client = apt.clients as { name: string | null; phone: string | null }
        const service = apt.services as { name: string }
        const employee = apt.employees as { name: string }

        reminders.push({
          appointment_id: apt.id,
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          client_name: client?.name || null,
          client_phone: client?.phone || null,
          service_name: service?.name || 'Servico',
          employee_name: employee?.name || 'Profissional',
          scheduled_at: apt.scheduled_at,
          formatted_date: formatDateBR(apt.scheduled_at),
          formatted_time: formatTimeInSaoPaulo(apt.scheduled_at),
          whatsapp_token: whatsappInstance?.instance_token || null
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: reminders.length,
        reminders
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

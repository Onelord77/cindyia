// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

const TIMEZONE_OFFSET = '-03:00' // America/Sao_Paulo (UTC-3)

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function validateAgentKey(supabase: any, apiKey: string, tenantId: string): Promise<{ valid: boolean; error?: string }> {
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

interface WorkingHours {
  [day: string]: {
    open: string
    close: string
    isOpen: boolean
  }
}

// Mapeamento de dias em português para inglês
const dayMappingPtToEn: Record<string, string> = {
  'dom': 'sunday',
  'seg': 'monday',
  'ter': 'tuesday',
  'qua': 'wednesday',
  'qui': 'thursday',
  'sex': 'friday',
  'sab': 'saturday'
}

// Mapeamento de dias em inglês para português
const dayMappingEnToPt: Record<string, string> = {
  'sunday': 'dom',
  'monday': 'seg',
  'tuesday': 'ter',
  'wednesday': 'qua',
  'thursday': 'qui',
  'friday': 'sex',
  'saturday': 'sab'
}

// Labels de dias para mensagens de erro
const dayLabels: Record<string, string> = {
  'dom': 'Domingo',
  'seg': 'Segunda',
  'ter': 'Terça',
  'qua': 'Quarta',
  'qui': 'Quinta',
  'sex': 'Sexta',
  'sab': 'Sábado'
}

// Normaliza working_hours para formato padrão (inglês)
function normalizeWorkingHours(workingHours: unknown): WorkingHours | null {
  if (!workingHours || typeof workingHours !== 'object') {
    return null
  }

  const wh = workingHours as Record<string, unknown>
  const normalized: WorkingHours = {}

  for (const [key, value] of Object.entries(wh)) {
    if (!value || typeof value !== 'object') continue

    const dayData = value as Record<string, unknown>

    // Determina o nome do dia em inglês
    const dayName = dayMappingPtToEn[key.toLowerCase()] || key.toLowerCase()

    // Detecta formato: PT-BR usa 'enabled/start/end', EN usa 'isOpen/open/close'
    const isPortugueseFormat = 'enabled' in dayData || 'start' in dayData

    if (isPortugueseFormat) {
      normalized[dayName] = {
        isOpen: Boolean(dayData.enabled),
        open: String(dayData.start || '09:00'),
        close: String(dayData.end || '18:00')
      }
    } else {
      normalized[dayName] = {
        isOpen: Boolean(dayData.isOpen),
        open: String(dayData.open || '09:00'),
        close: String(dayData.close || '18:00')
      }
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Parse ISO datetime string and extract date and time in São Paulo timezone
function parseDateTimeParam(dateTimeStr: string): { date: string; time: string; isoString: string } | null {
  try {
    const parsedDate = new Date(dateTimeStr)
    if (isNaN(parsedDate.getTime())) {
      return null
    }

    // Convert to São Paulo time (UTC-3)
    const utcTime = parsedDate.getTime()
    const spTime = new Date(utcTime - 3 * 60 * 60 * 1000)

    // Extract date (YYYY-MM-DD)
    const date = spTime.toISOString().split('T')[0]

    // Extract time (HH:MM)
    const hours = spTime.getUTCHours().toString().padStart(2, '0')
    const minutes = spTime.getUTCMinutes().toString().padStart(2, '0')
    const time = `${hours}:${minutes}`

    // Build ISO string with São Paulo timezone for storage
    const isoString = `${date}T${time}:00${TIMEZONE_OFFSET}`

    return { date, time, isoString }
  } catch {
    return null
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Formata horário em São Paulo (UTC-3) a partir de ISO string ou Date
function formatTimeInSaoPaulo(isoString: string): string {
  const date = new Date(isoString)
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
    const { tenantId, appointmentId, dateTime, employeeId: newEmployeeId, notes } = body

    // ============ VALIDATION ============

    // 1. Required fields
    if (!tenantId || !appointmentId || !dateTime) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: tenantId, appointmentId, dateTime'
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

    if (newEmployeeId && !isValidUUID(newEmployeeId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid employeeId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parse dateTime
    const parsedDateTime = parseDateTimeParam(dateTime)
    if (!parsedDateTime) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid dateTime format. Use ISO 8601 format (e.g., 2026-01-26T13:38:14.085-03:00)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { date, time, isoString: newScheduledAt } = parsedDateTime

    // 4. Date not in the past
    const now = new Date()
    const requestedDateTime = new Date(newScheduledAt)
    if (requestedDateTime < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot reschedule to a past date/time' }),
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
        employees (id, name, working_hours, is_active),
        services (id, name, duration, price, is_active),
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

    // 5. Status validation - cannot reschedule completed/cancelled/no_show
    const nonReschedulableStatuses = ['completed', 'cancelled', 'no_show']
    if (nonReschedulableStatuses.includes(appointment.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot reschedule appointment with status: ${appointment.status}`
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const service = appointment.services
    if (!service || !service.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service is no longer active' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ DETERMINE EMPLOYEE (current or new) ============

    let employee = appointment.employees
    const isChangingEmployee = newEmployeeId && newEmployeeId !== appointment.employee_id

    if (isChangingEmployee) {
      // Fetch the new employee
      const { data: newEmployee, error: newEmployeeError } = await supabase
        .from('employees')
        .select('id, name, working_hours, is_active, tenant_id')
        .eq('id', newEmployeeId)
        .eq('tenant_id', tenantId)
        .single()

      if (newEmployeeError || !newEmployee) {
        return new Response(
          JSON.stringify({ success: false, error: 'New professional not found for this tenant' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!newEmployee.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: 'New professional is not active' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if new employee can perform the service
      const { data: employeeService, error: esError } = await supabase
        .from('employee_services')
        .select('id')
        .eq('employee_id', newEmployeeId)
        .eq('service_id', service.id)
        .single()

      if (esError || !employeeService) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Professional "${newEmployee.name}" is not qualified to perform service "${service.name}"`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      employee = newEmployee
    } else {
      // Using current employee - validate they are still active
      if (!employee || !employee.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: 'Professional is no longer active' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============ FETCH TENANT SETTINGS ============

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, settings, status')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (tenant.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant is not active' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ DATE/DAY CALCULATION ============

    const requestedDate = new Date(date + 'T12:00:00Z')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[requestedDate.getUTCDay()]
    const dayKeyPt = dayMappingEnToPt[dayOfWeek]

    // ============ COMPANY WORKING HOURS VALIDATION ============

    const tenantSettings = (tenant as Record<string, unknown>)?.settings as Record<string, unknown> || {}
    const companyOpenTime = (tenantSettings.openTime as string) || '09:00'
    const companyCloseTime = (tenantSettings.closeTime as string) || '19:00'
    const companyWorkingDays = (tenantSettings.workingDays as string[]) || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']

    // Check if company works on this day
    if (!companyWorkingDays.includes(dayKeyPt)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Empresa não funciona neste dia (${dayLabels[dayKeyPt] || dayOfWeek})`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check company hours
    const reqMinutes = timeToMinutes(time)
    const companyOpenMins = timeToMinutes(companyOpenTime)
    const companyCloseMins = timeToMinutes(companyCloseTime)
    const serviceEndMinutes = reqMinutes + service.duration

    if (reqMinutes < companyOpenMins) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Horário ${time} é antes da abertura da empresa (${companyOpenTime})`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (serviceEndMinutes > companyCloseMins) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Agendamento terminaria após fechamento da empresa (${companyCloseTime}). Duração do serviço: ${service.duration} minutos`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ PROFESSIONAL WORKING HOURS VALIDATION ============

    const workingHours = normalizeWorkingHours(employee.working_hours)
    const dayHours = workingHours?.[dayOfWeek]

    if (!dayHours || !dayHours.isOpen) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Profissional "${employee.name}" não trabalha neste dia (${dayLabels[dayKeyPt] || dayOfWeek})`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openMinutes = timeToMinutes(dayHours.open)
    const closeMinutes = timeToMinutes(dayHours.close)

    if (reqMinutes < openMinutes) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Horário ${time} é antes do início do expediente do profissional (${dayHours.open})`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (serviceEndMinutes > closeMinutes) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Agendamento terminaria após fim do expediente do profissional (${dayHours.close}). Duração do serviço: ${service.duration} minutos`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ BREAK VALIDATION ============

    const employeeData = employee.working_hours as Record<string, unknown>
    const breaksConfig = employeeData?.breaks as { breaks?: Array<{ start: string; end: string; label?: string }> } | undefined
    const breaks = breaksConfig?.breaks || []

    for (const breakPeriod of breaks) {
      const breakStartMins = timeToMinutes(breakPeriod.start)
      const breakEndMins = timeToMinutes(breakPeriod.end)

      // Check overlap
      if (reqMinutes < breakEndMins && serviceEndMinutes > breakStartMins) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Horário conflita com intervalo do profissional (${breakPeriod.start} - ${breakPeriod.end}${breakPeriod.label ? ': ' + breakPeriod.label : ''})`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============ CONFLICT CHECK ============

    const appointmentStart = new Date(newScheduledAt)
    const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000)

    const dayStart = `${date}T00:00:00${TIMEZONE_OFFSET}`
    const dayEnd = `${date}T23:59:59${TIMEZONE_OFFSET}`

    const { data: existingAppointments, error: conflictError } = await supabase
      .from('appointments')
      .select('id, scheduled_at, duration, status')
      .eq('employee_id', employee.id)
      .eq('tenant_id', tenantId)
      .neq('id', appointmentId) // Exclude current appointment
      .gte('scheduled_at', dayStart)
      .lte('scheduled_at', dayEnd)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingAppointments && existingAppointments.length > 0) {
      for (const existing of existingAppointments) {
        const existingStart = new Date(existing.scheduled_at)
        const existingEnd = new Date(existingStart.getTime() + existing.duration * 60000)

        if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
          const existingStartTime = formatTimeInSaoPaulo(existingStart.toISOString())
          const existingEndTime = formatTimeInSaoPaulo(existingEnd.toISOString())
          return new Response(
            JSON.stringify({
              success: false,
              error: `Time slot conflicts with existing appointment (${existingStartTime} - ${existingEndTime})`
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ============ UPDATE APPOINTMENT ============

    const previousScheduledAt = appointment.scheduled_at
    const previousEmployeeId = appointment.employee_id
    const updateData: Record<string, unknown> = {
      scheduled_at: newScheduledAt,
      updated_at: new Date().toISOString()
    }

    if (isChangingEmployee) {
      updateData.employee_id = employee.id
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating appointment:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to reschedule appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SUCCESS RESPONSE ============

    const endDateTime = new Date(appointmentStart.getTime() + service.duration * 60000)
    const endTime = formatTimeInSaoPaulo(endDateTime.toISOString())

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: updatedAppointment.id,
          previousScheduledAt,
          newScheduledAt: updatedAppointment.scheduled_at,
          date,
          time,
          endTime,
          duration: service.duration,
          status: updatedAppointment.status,
          professionalChanged: isChangingEmployee,
          previousProfessionalId: isChangingEmployee ? previousEmployeeId : null,
          professional: {
            id: employee.id,
            name: employee.name
          },
          client: appointment.clients ? {
            id: appointment.clients.id,
            name: appointment.clients.name,
            phone: appointment.clients.phone
          } : null,
          service: {
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: service.price
          }
        },
        message: isChangingEmployee
          ? `Agendamento reagendado com sucesso para ${date} às ${time} com ${employee.name}`
          : `Agendamento reagendado com sucesso para ${date} às ${time}`
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

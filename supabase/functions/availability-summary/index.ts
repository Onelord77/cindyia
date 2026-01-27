import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
}

const TIMEZONE_OFFSET = '-03:00' // America/Sao_Paulo (UTC-3)
const MAX_DAYS = 14 // Maximum days per query
const DEFAULT_SLOTS_LIMIT = 5 // Default max slots per professional per day

// ============ AUTH FUNCTIONS ============

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

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

  // Update last_used_at in background
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

const dayMappingPtToEn: Record<string, string> = {
  'dom': 'sunday',
  'seg': 'monday',
  'ter': 'tuesday',
  'qua': 'wednesday',
  'qui': 'thursday',
  'sex': 'friday',
  'sab': 'saturday'
}

const dayMappingEnToPt: Record<string, string> = {
  'sunday': 'domingo',
  'monday': 'segunda',
  'tuesday': 'terca',
  'wednesday': 'quarta',
  'thursday': 'quinta',
  'friday': 'sexta',
  'saturday': 'sabado'
}

function normalizeWorkingHours(workingHours: unknown): WorkingHours | null {
  if (!workingHours || typeof workingHours !== 'object') {
    return null
  }

  const wh = workingHours as Record<string, unknown>
  const normalized: WorkingHours = {}

  for (const [key, value] of Object.entries(wh)) {
    if (!value || typeof value !== 'object') continue

    const dayData = value as Record<string, unknown>
    const dayName = dayMappingPtToEn[key.toLowerCase()] || key.toLowerCase()
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

// Parse date parameter - accepts both ISO format (2026-01-27T10:00:00-03:00) and date only (2026-01-27)
// Returns the date part (YYYY-MM-DD) in São Paulo timezone
function parseDateParam(dateStr: string): string | null {
  if (!dateStr) return null

  try {
    // Check if it's just a date (YYYY-MM-DD)
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/
    if (dateOnlyRegex.test(dateStr)) {
      const date = new Date(dateStr + 'T12:00:00Z')
      if (isNaN(date.getTime())) return null
      return dateStr
    }

    // Try to parse as ISO datetime
    const parsedDate = new Date(dateStr)
    if (isNaN(parsedDate.getTime())) return null

    // Convert to São Paulo time (UTC-3) and extract date
    const utcTime = parsedDate.getTime()
    const spTime = new Date(utcTime - 3 * 60 * 60 * 1000)
    return spTime.toISOString().split('T')[0]
  } catch {
    return null
  }
}

function formatTimeInSaoPaulo(d: Date): string {
  const spTime = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  const hours = spTime.getUTCHours().toString().padStart(2, '0')
  const minutes = spTime.getUTCMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function createSaoPauloDateTime(dateStr: string, timeStr: string): Date {
  const isoString = `${dateStr}T${timeStr}:00-03:00`
  return new Date(isoString)
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split('T')[0]
}

function getDaysBetween(startDate: string, endDate: string): string[] {
  const days: string[] = []
  let current = startDate
  while (current <= endDate) {
    days.push(current)
    current = addDays(current, 1)
  }
  return days
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'method_not_allowed', message: 'Use GET method' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse query params
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId')
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')
    const serviceId = url.searchParams.get('serviceId')
    const professionalId = url.searchParams.get('professionalId')
    const limitParam = url.searchParams.get('limit')
    const slotsLimit = limitParam ? parseInt(limitParam, 10) : DEFAULT_SLOTS_LIMIT

    // ============ VALIDATION ============

    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_parameter', message: "Parameter 'tenantId' is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidUUID(tenantId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_format', message: 'Invalid tenantId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!startDateParam) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing_parameter', message: "Parameter 'startDate' is required (ISO 8601 or YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse dates (accepts ISO 8601 or YYYY-MM-DD)
    const startDate = parseDateParam(startDateParam)
    if (!startDate) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_format', message: 'Invalid startDate format (use ISO 8601 or YYYY-MM-DD)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const endDate = endDateParam ? parseDateParam(endDateParam) : startDate
    if (endDateParam && !endDate) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_format', message: 'Invalid endDate format (use ISO 8601 or YYYY-MM-DD)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (serviceId && !isValidUUID(serviceId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_format', message: 'Invalid serviceId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (professionalId && !isValidUUID(professionalId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_format', message: 'Invalid professionalId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ API KEY VALIDATION ============

    const agentKey = req.headers.get('x-agent-key')
    const keyValidation = await validateAgentKey(supabase, agentKey || '', tenantId)
    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized', message: keyValidation.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ DATE RANGE CALCULATION ============

    const effectiveEndDate = endDate!
    const days = getDaysBetween(startDate, effectiveEndDate)

    if (days.length > MAX_DAYS) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'range_too_large',
          message: `Date range cannot exceed ${MAX_DAYS} days. Requested: ${days.length} days`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ FETCH SERVICE (if provided) ============

    let serviceDuration = 30 // default
    let serviceName: string | null = null
    let servicePrice: number | null = null

    if (serviceId) {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id, name, duration, price, is_active')
        .eq('id', serviceId)
        .eq('tenant_id', tenantId)
        .single()

      if (serviceError || !service) {
        return new Response(
          JSON.stringify({ success: false, error: 'not_found', message: 'Service not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!service.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: 'inactive_service', message: 'Service is not active' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      serviceDuration = service.duration
      serviceName = service.name
      servicePrice = service.price
    }

    // ============ FETCH TENANT SETTINGS ============

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, settings, status')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ success: false, error: 'not_found', message: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (tenant.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'inactive_tenant', message: 'Tenant is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tenantSettings = (tenant as Record<string, unknown>)?.settings as Record<string, unknown> || {}
    const companyWorkingDays = (tenantSettings.workingDays as string[]) || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']

    // ============ FETCH EMPLOYEES ============

    let employeesQuery = supabase
      .from('employees')
      .select('id, name, working_hours')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)

    if (professionalId) {
      employeesQuery = employeesQuery.eq('id', professionalId)
    }

    const { data: employees, error: employeesError } = await employeesQuery

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return new Response(
        JSON.stringify({ success: false, error: 'internal_error', message: 'Error fetching professionals' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          query: { startDate, endDate: effectiveEndDate, serviceId, serviceName, serviceDuration },
          summary: { totalDays: days.length, daysWithAvailability: 0, nextAvailableSlot: null },
          availability: days.map(d => ({
            date: d,
            dayOfWeek: dayMappingEnToPt[new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()],
            hasAvailability: false,
            professionals: [],
            reason: professionalId ? 'Profissional não encontrado ou inativo' : 'Nenhum profissional ativo'
          }))
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ FILTER BY SERVICE (if provided) ============

    let filteredEmployeeIds: string[] = employees.map(e => e.id)

    if (serviceId) {
      const { data: employeeServicesData, error: esError } = await supabase
        .from('employee_services')
        .select('employee_id')
        .eq('service_id', serviceId)
        .in('employee_id', filteredEmployeeIds)

      if (esError) {
        console.error('Error fetching employee_services:', esError)
      } else if (employeeServicesData) {
        filteredEmployeeIds = employeeServicesData.map(es => es.employee_id)
      }
    }

    const eligibleEmployees = serviceId
      ? employees.filter(e => filteredEmployeeIds.includes(e.id))
      : employees

    // ============ FETCH ALL APPOINTMENTS FOR DATE RANGE ============

    const rangeStart = `${startDate}T00:00:00${TIMEZONE_OFFSET}`
    const rangeEnd = `${effectiveEndDate}T23:59:59${TIMEZONE_OFFSET}`

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, employee_id, scheduled_at, duration, status')
      .eq('tenant_id', tenantId)
      .gte('scheduled_at', rangeStart)
      .lte('scheduled_at', rangeEnd)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return new Response(
        JSON.stringify({ success: false, error: 'internal_error', message: 'Error fetching appointments' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group appointments by employee and date
    const appointmentsByEmployeeDate: Record<string, Record<string, Array<{ start: Date; end: Date }>>> = {}
    for (const apt of appointments || []) {
      if (!apt.employee_id) continue
      const aptStart = new Date(apt.scheduled_at)
      const aptDate = formatDateFromDate(aptStart)
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000)

      if (!appointmentsByEmployeeDate[apt.employee_id]) {
        appointmentsByEmployeeDate[apt.employee_id] = {}
      }
      if (!appointmentsByEmployeeDate[apt.employee_id][aptDate]) {
        appointmentsByEmployeeDate[apt.employee_id][aptDate] = []
      }
      appointmentsByEmployeeDate[apt.employee_id][aptDate].push({ start: aptStart, end: aptEnd })
    }

    // Helper to get date string from Date in SP timezone
    function formatDateFromDate(d: Date): string {
      const spTime = new Date(d.getTime() - 3 * 60 * 60 * 1000)
      return spTime.toISOString().split('T')[0]
    }

    // ============ CALCULATE AVAILABILITY FOR EACH DAY ============

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayKeysPt: Record<string, string> = {
      'sunday': 'dom', 'monday': 'seg', 'tuesday': 'ter', 'wednesday': 'qua',
      'thursday': 'qui', 'friday': 'sex', 'saturday': 'sab'
    }

    const availability: Array<{
      date: string
      dayOfWeek: string
      hasAvailability: boolean
      professionals: Array<{
        id: string
        name: string
        slots: Array<{ start: string; end: string }>
      }>
      reason?: string
    }> = []

    let nextAvailableSlot: { date: string; time: string; professional: string; professionalId: string } | null = null
    let daysWithAvailability = 0

    for (const date of days) {
      const requestedDate = new Date(date + 'T12:00:00Z')
      const dayOfWeek = dayNames[requestedDate.getUTCDay()]
      const dayKeyPt = dayKeysPt[dayOfWeek]
      const dayOfWeekPt = dayMappingEnToPt[dayOfWeek]

      // Check if company works this day
      if (!companyWorkingDays.includes(dayKeyPt)) {
        availability.push({
          date,
          dayOfWeek: dayOfWeekPt,
          hasAvailability: false,
          professionals: [],
          reason: 'Empresa fechada neste dia'
        })
        continue
      }

      const dayProfessionals: Array<{
        id: string
        name: string
        slots: Array<{ start: string; end: string }>
      }> = []

      for (const employee of eligibleEmployees) {
        const workingHours = normalizeWorkingHours(employee.working_hours)
        const dayHours = workingHours?.[dayOfWeek]

        if (!dayHours || !dayHours.isOpen) {
          continue // Employee doesn't work this day
        }

        const workStart = dayHours.open || '09:00'
        const workEnd = dayHours.close || '18:00'

        const employeeAppointments = appointmentsByEmployeeDate[employee.id]?.[date] || []

        // Get breaks
        const employeeData = employee.working_hours as Record<string, unknown>
        const breaksConfig = employeeData?.breaks as { breaks?: Array<{ start: string; end: string }> } | undefined
        const breaks = breaksConfig?.breaks || []

        // Create work day boundaries
        const workDayStart = createSaoPauloDateTime(date, workStart)
        const workDayEnd = createSaoPauloDateTime(date, workEnd)

        // Convert breaks to time ranges
        const breakRanges: Array<{ start: Date; end: Date }> = []
        for (const breakPeriod of breaks) {
          const breakStart = createSaoPauloDateTime(date, breakPeriod.start)
          const breakEnd = createSaoPauloDateTime(date, breakPeriod.end)
          if (breakEnd > workDayStart && breakStart < workDayEnd) {
            breakRanges.push({
              start: breakStart < workDayStart ? workDayStart : breakStart,
              end: breakEnd > workDayEnd ? workDayEnd : breakEnd
            })
          }
        }

        // Combine appointments and breaks as occupied
        const allOccupied = [...employeeAppointments, ...breakRanges].sort((a, b) => a.start.getTime() - b.start.getTime())

        // Calculate available slots
        const slots: Array<{ start: string; end: string }> = []
        let currentStart = new Date(workDayStart)

        for (const occupied of allOccupied) {
          if (occupied.start > currentStart && occupied.start < workDayEnd) {
            const gapEnd = occupied.start < workDayEnd ? occupied.start : workDayEnd
            if (gapEnd > currentStart) {
              const gapMinutes = (gapEnd.getTime() - currentStart.getTime()) / 60000
              if (gapMinutes >= serviceDuration) {
                slots.push({
                  start: formatTimeInSaoPaulo(currentStart),
                  end: formatTimeInSaoPaulo(gapEnd)
                })
              }
            }
          }
          if (occupied.end > currentStart) {
            currentStart = new Date(occupied.end)
          }
        }

        // Add remaining time after last occupied
        if (currentStart < workDayEnd) {
          const gapMinutes = (workDayEnd.getTime() - currentStart.getTime()) / 60000
          if (gapMinutes >= serviceDuration) {
            slots.push({
              start: formatTimeInSaoPaulo(currentStart),
              end: formatTimeInSaoPaulo(workDayEnd)
            })
          }
        }

        // Limit slots per professional
        const limitedSlots = slots.slice(0, slotsLimit)

        if (limitedSlots.length > 0) {
          dayProfessionals.push({
            id: employee.id,
            name: employee.name,
            slots: limitedSlots
          })

          // Track first available slot
          if (!nextAvailableSlot) {
            nextAvailableSlot = {
              date,
              time: limitedSlots[0].start,
              professional: employee.name,
              professionalId: employee.id
            }
          }
        }
      }

      const hasAvailability = dayProfessionals.length > 0
      if (hasAvailability) {
        daysWithAvailability++
      }

      availability.push({
        date,
        dayOfWeek: dayOfWeekPt,
        hasAvailability,
        professionals: dayProfessionals,
        ...(hasAvailability ? {} : { reason: eligibleEmployees.length === 0 ? 'Nenhum profissional disponível para este serviço' : 'Agenda cheia' })
      })
    }

    // ============ BUILD RESPONSE ============

    return new Response(
      JSON.stringify({
        success: true,
        query: {
          startDate,
          endDate: effectiveEndDate,
          serviceId: serviceId || null,
          serviceName,
          serviceDuration,
          servicePrice,
          professionalId: professionalId || null
        },
        summary: {
          totalDays: days.length,
          daysWithAvailability,
          nextAvailableSlot
        },
        availability
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

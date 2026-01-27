import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

// Parse ISO datetime string and extract date and time in São Paulo timezone
function parseDateTimeParam(dateTimeStr: string): { date: string; time: string } | null {
  try {
    // Parse the ISO string
    const parsedDate = new Date(dateTimeStr)
    if (isNaN(parsedDate.getTime())) {
      return null
    }

    // Convert to São Paulo time (UTC-3)
    const utcTime = parsedDate.getTime()
    const spTime = new Date(utcTime - 3 * 60 * 60 * 1000)

    // Extract date (YYYY-MM-DD)
    const date = spTime.toISOString().split('T')[0]

    // Extract time (HH:MM) from the original parsed date adjusted to SP
    const hours = spTime.getUTCHours().toString().padStart(2, '0')
    const minutes = spTime.getUTCMinutes().toString().padStart(2, '0')
    const time = `${hours}:${minutes}`

    return { date, time }
  } catch {
    return null
  }
}

interface TimeSlot {
  start: string
  end: string
}

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
      // Formato PT-BR: { enabled, start, end }
      normalized[dayName] = {
        isOpen: Boolean(dayData.enabled),
        open: String(dayData.start || '09:00'),
        close: String(dayData.end || '18:00')
      }
    } else {
      // Formato EN: { isOpen, open, close }
      normalized[dayName] = {
        isOpen: Boolean(dayData.isOpen),
        open: String(dayData.open || '09:00'),
        close: String(dayData.close || '18:00')
      }
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse query params
    const url = new URL(req.url)
    const dateTimeParam = url.searchParams.get('dateTime')
    const serviceId = url.searchParams.get('serviceId')
    const tenantId = url.searchParams.get('tenantId')

    // Validate required params
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Parameter "tenantId" is required' }),
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

    if (!dateTimeParam) {
      return new Response(
        JSON.stringify({ error: 'Parameter "dateTime" is required (ISO 8601 format, e.g., 2026-01-26T13:38:14.085-03:00)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse dateTime parameter
    const parsedDateTime = parseDateTimeParam(dateTimeParam)
    if (!parsedDateTime) {
      return new Response(
        JSON.stringify({ error: 'Invalid dateTime format. Use ISO 8601 format (e.g., 2026-01-26T13:38:14.085-03:00)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { date, time: startTime } = parsedDateTime
    // No end time filter - show all available slots from the given time onwards
    const endTime: string | null = null

    // Build employees query
    let employeesQuery = supabase
      .from('employees')
      .select('id, name, working_hours, tenant_id')
      .eq('is_active', true)

    employeesQuery = employeesQuery.eq('tenant_id', tenantId)

    const { data: employees, error: employeesError } = await employeesQuery

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return new Response(
        JSON.stringify({ error: 'Error fetching professionals', details: employeesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ date, requestedTime: startTime, available: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If serviceId is provided, filter employees by those who can perform the service
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

    // Filter employees to only those who can perform the service
    const eligibleEmployees = serviceId 
      ? employees.filter(e => filteredEmployeeIds.includes(e.id))
      : employees

    if (eligibleEmployees.length === 0) {
      return new Response(
        JSON.stringify({ date, requestedTime: startTime, available: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get day of week for the requested date
    const requestedDate = new Date(date + 'T12:00:00Z')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[requestedDate.getUTCDay()]

    // Get start and end of day for appointments query (São Paulo timezone)
    const dayStart = `${date}T00:00:00${TIMEZONE_OFFSET}`
    const dayEnd = `${date}T23:59:59${TIMEZONE_OFFSET}`

    // Fetch appointments for the date
    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, employee_id, scheduled_at, duration, status')
      .gte('scheduled_at', dayStart)
      .lte('scheduled_at', dayEnd)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])

    appointmentsQuery = appointmentsQuery.eq('tenant_id', tenantId)

    const { data: appointments, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return new Response(
        JSON.stringify({ error: 'Error fetching appointments', details: appointmentsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get service duration if serviceId provided
    let serviceDuration = 30 // default 30 min slots
    if (serviceId) {
      const { data: service } = await supabase
        .from('services')
        .select('duration')
        .eq('id', serviceId)
        .single()
      
      if (service) {
        serviceDuration = service.duration
      }
    }

    // Group appointments by employee
    const appointmentsByEmployee: Record<string, Array<{ start: Date; end: Date }>> = {}
    for (const apt of appointments || []) {
      if (!apt.employee_id) continue
      if (!appointmentsByEmployee[apt.employee_id]) {
        appointmentsByEmployee[apt.employee_id] = []
      }
      const aptStart = new Date(apt.scheduled_at)
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000)
      appointmentsByEmployee[apt.employee_id].push({ start: aptStart, end: aptEnd })
    }

    // Helper function to format time as HH:MM in São Paulo timezone (UTC-3)
    const formatTimeInSaoPaulo = (d: Date): string => {
      // Ajustar UTC para São Paulo (UTC-3)
      const spTime = new Date(d.getTime() - 3 * 60 * 60 * 1000)
      const hours = spTime.getUTCHours().toString().padStart(2, '0')
      const minutes = spTime.getUTCMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }

    // Helper function to create a Date object for a given date and time in São Paulo timezone
    // Input: date "YYYY-MM-DD", time "HH:MM" (São Paulo local time)
    // Output: Date object representing that moment in UTC
    const createSaoPauloDateTime = (dateStr: string, timeStr: string): Date => {
      // Create ISO string with São Paulo offset
      const isoString = `${dateStr}T${timeStr}:00-03:00`
      return new Date(isoString)
    }

    // Calculate available time ranges for each employee
    const available: Array<{
      professionalId: string
      name: string
      workingHours: { start: string; end: string }
      availableRanges: Array<{ start: string; end: string }>
      occupiedRanges: Array<{ start: string; end: string }>
    }> = []

    for (const employee of eligibleEmployees) {
      // Normaliza working_hours para suportar ambos os formatos (PT-BR e EN)
      const workingHours = normalizeWorkingHours(employee.working_hours)
      
      // Get working hours for the day
      const dayHours = workingHours?.[dayOfWeek]
      
      if (!dayHours || !dayHours.isOpen) {
        continue // Employee doesn't work this day
      }

      let workStart = dayHours.open || '09:00'
      let workEnd = dayHours.close || '18:00'

      // Store original working hours before applying filters
      const originalWorkStart = workStart
      const originalWorkEnd = workEnd

      // Apply time filters if provided
      if (startTime && startTime > workStart) {
        workStart = startTime
      }
      if (endTime && endTime < workEnd) {
        workEnd = endTime
      }

      const employeeAppointments = appointmentsByEmployee[employee.id] || []

      // Create work day boundaries using São Paulo timezone
      const workDayStart = createSaoPauloDateTime(date, workStart)
      const workDayEnd = createSaoPauloDateTime(date, workEnd)

      // Sort appointments by start time
      const sortedAppointments = [...employeeAppointments].sort((a, b) => a.start.getTime() - b.start.getTime())

      // Extract breaks from employee's working_hours
      const employeeData = employee.working_hours as Record<string, unknown>
      const breaksConfig = employeeData?.breaks as { breaks?: Array<{ start: string; end: string; label?: string }> } | undefined
      const breaks = breaksConfig?.breaks || []

      // Convert breaks to time ranges for the day (using São Paulo timezone)
      const breakRanges: Array<{ start: Date; end: Date }> = []
      for (const breakPeriod of breaks) {
        const breakStart = createSaoPauloDateTime(date, breakPeriod.start)
        const breakEnd = createSaoPauloDateTime(date, breakPeriod.end)

        // Only include breaks within working hours
        if (breakEnd > workDayStart && breakStart < workDayEnd) {
          breakRanges.push({
            start: breakStart < workDayStart ? workDayStart : breakStart,
            end: breakEnd > workDayEnd ? workDayEnd : breakEnd
          })
        }
      }

      // Combine appointments and breaks as "occupied" periods
      const allOccupied = [...sortedAppointments, ...breakRanges].sort((a, b) => a.start.getTime() - b.start.getTime())

      // Calculate occupied ranges (from existing appointments AND breaks)
      const occupiedRanges: Array<{ start: string; end: string }> = []
      for (const occupied of allOccupied) {
        // Only include if within working hours
        if (occupied.end > workDayStart && occupied.start < workDayEnd) {
          const rangeStart = occupied.start < workDayStart ? workDayStart : occupied.start
          const rangeEnd = occupied.end > workDayEnd ? workDayEnd : occupied.end
          occupiedRanges.push({
            start: formatTimeInSaoPaulo(rangeStart),
            end: formatTimeInSaoPaulo(rangeEnd)
          })
        }
      }

      // Calculate available ranges (gaps between occupied periods)
      const availableRanges: Array<{ start: string; end: string }> = []
      let currentStart = new Date(workDayStart)

      for (const occupied of allOccupied) {
        // If occupied period starts after current position, we have a free gap
        if (occupied.start > currentStart && occupied.start < workDayEnd) {
          const gapEnd = occupied.start < workDayEnd ? occupied.start : workDayEnd
          if (gapEnd > currentStart) {
            // Only add if gap is at least serviceDuration minutes
            const gapMinutes = (gapEnd.getTime() - currentStart.getTime()) / 60000
            if (gapMinutes >= serviceDuration) {
              availableRanges.push({
                start: formatTimeInSaoPaulo(currentStart),
                end: formatTimeInSaoPaulo(gapEnd)
              })
            }
          }
        }
        // Move current position to end of occupied period
        if (occupied.end > currentStart) {
          currentStart = new Date(occupied.end)
        }
      }

      // Add remaining time after last occupied period
      if (currentStart < workDayEnd) {
        const gapMinutes = (workDayEnd.getTime() - currentStart.getTime()) / 60000
        if (gapMinutes >= serviceDuration) {
          availableRanges.push({
            start: formatTimeInSaoPaulo(currentStart),
            end: formatTimeInSaoPaulo(workDayEnd)
          })
        }
      }

      // Always include professional, even if no availability (for clarity)
      available.push({
        professionalId: employee.id,
        name: employee.name,
        workingHours: {
          start: originalWorkStart,
          end: originalWorkEnd
        },
        availableRanges,
        occupiedRanges
      })
    }

    return new Response(
      JSON.stringify({
        date,
        requestedTime: startTime,
        available
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

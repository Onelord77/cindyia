import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const date = url.searchParams.get('date')
    const startTime = url.searchParams.get('start')
    const endTime = url.searchParams.get('end')
    const serviceId = url.searchParams.get('serviceId')
    const tenantId = url.searchParams.get('tenantId')

    // Validate required params
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Parameter "tenantId" is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!date) {
      return new Response(
        JSON.stringify({ error: 'Parameter "date" is required (YYYY-MM-DD)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        JSON.stringify({ date, available: [] }),
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
        JSON.stringify({ date, available: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get day of week for the requested date
    const requestedDate = new Date(date + 'T12:00:00Z')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[requestedDate.getUTCDay()]

    // Get start and end of day for appointments query
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`

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

    // Helper function to format time as HH:MM
    const formatTime = (d: Date): string => {
      const hours = d.getHours().toString().padStart(2, '0')
      const minutes = d.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
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

      // Parse work times
      const [workStartHour, workStartMin] = workStart.split(':').map(Number)
      const [workEndHour, workEndMin] = workEnd.split(':').map(Number)

      const workDayStart = new Date(date + 'T00:00:00')
      workDayStart.setHours(workStartHour, workStartMin, 0, 0)

      const workDayEnd = new Date(date + 'T00:00:00')
      workDayEnd.setHours(workEndHour, workEndMin, 0, 0)

      // Sort appointments by start time
      const sortedAppointments = [...employeeAppointments].sort((a, b) => a.start.getTime() - b.start.getTime())

      // Extract breaks from employee's working_hours
      const employeeData = employee.working_hours as Record<string, unknown>
      const breaksConfig = employeeData?.breaks as { breaks?: Array<{ start: string; end: string; label?: string }> } | undefined
      const breaks = breaksConfig?.breaks || []

      // Convert breaks to time ranges for the day
      const breakRanges: Array<{ start: Date; end: Date }> = []
      for (const breakPeriod of breaks) {
        const [breakStartH, breakStartM] = breakPeriod.start.split(':').map(Number)
        const [breakEndH, breakEndM] = breakPeriod.end.split(':').map(Number)
        
        const breakStart = new Date(date + 'T00:00:00')
        breakStart.setHours(breakStartH, breakStartM, 0, 0)
        
        const breakEnd = new Date(date + 'T00:00:00')
        breakEnd.setHours(breakEndH, breakEndM, 0, 0)
        
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
            start: formatTime(rangeStart),
            end: formatTime(rangeEnd)
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
                start: formatTime(currentStart),
                end: formatTime(gapEnd)
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
            start: formatTime(currentStart),
            end: formatTime(workDayEnd)
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
      JSON.stringify({ date, available }),
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

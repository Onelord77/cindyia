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

    // Calculate available slots for each employee
    const available: Array<{
      professionalId: string
      name: string
      tenantId: string
      slots: string[]
    }> = []

    for (const employee of eligibleEmployees) {
      // Normaliza working_hours para suportar ambos os formatos (PT-BR e EN)
      const workingHours = normalizeWorkingHours(employee.working_hours)
      
      // Get working hours for the day
      let dayHours = workingHours?.[dayOfWeek]
      
      if (!dayHours || !dayHours.isOpen) {
        continue // Employee doesn't work this day
      }

      let workStart = dayHours.open || '09:00'
      let workEnd = dayHours.close || '18:00'

      // Apply time filters if provided
      if (startTime && startTime > workStart) {
        workStart = startTime
      }
      if (endTime && endTime < workEnd) {
        workEnd = endTime
      }

      // Generate time slots
      const slots: string[] = []
      const employeeAppointments = appointmentsByEmployee[employee.id] || []

      // Parse work times
      const [workStartHour, workStartMin] = workStart.split(':').map(Number)
      const [workEndHour, workEndMin] = workEnd.split(':').map(Number)

      const slotStart = new Date(date + 'T00:00:00')
      slotStart.setHours(workStartHour, workStartMin, 0, 0)

      const slotEnd = new Date(date + 'T00:00:00')
      slotEnd.setHours(workEndHour, workEndMin, 0, 0)

      // Generate slots with serviceDuration interval
      let currentSlot = new Date(slotStart)
      while (currentSlot < slotEnd) {
        const slotEndTime = new Date(currentSlot.getTime() + serviceDuration * 60000)
        
        // Check if slot overlaps with any appointment
        const isOccupied = employeeAppointments.some(apt => {
          return currentSlot < apt.end && slotEndTime > apt.start
        })

        if (!isOccupied && slotEndTime <= slotEnd) {
          const hours = currentSlot.getHours().toString().padStart(2, '0')
          const minutes = currentSlot.getMinutes().toString().padStart(2, '0')
          slots.push(`${hours}:${minutes}`)
        }

        // Move to next slot
        currentSlot = new Date(currentSlot.getTime() + serviceDuration * 60000)
      }

      if (slots.length > 0) {
        available.push({
          professionalId: employee.id,
          name: employee.name,
          tenantId: employee.tenant_id,
          slots
        })
      }
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

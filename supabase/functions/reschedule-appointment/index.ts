import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Timezone Brasil (America/Sao_Paulo = UTC-03)
const TIMEZONE_OFFSET = '-03:00'

// ============ UTILITY FUNCTIONS ============

interface WorkingHours {
  [day: string]: {
    open: string
    close: string
    isOpen: boolean
    breaks?: Array<{ start: string; end: string }>
  }
}

function normalizeWorkingHours(workingHours: unknown): WorkingHours | null {
  if (!workingHours || typeof workingHours !== 'object') {
    return null
  }

  const wh = workingHours as Record<string, unknown>
  const normalized: WorkingHours = {}

  // Map PT-BR day names to EN
  const dayMapping: Record<string, string> = {
    'domingo': 'sunday',
    'segunda': 'monday',
    'terca': 'tuesday',
    'terça': 'tuesday',
    'quarta': 'wednesday',
    'quinta': 'thursday',
    'sexta': 'friday',
    'sabado': 'saturday',
    'sábado': 'saturday',
    'sunday': 'sunday',
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
  }

  for (const [key, value] of Object.entries(wh)) {
    if (!value || typeof value !== 'object') continue

    const dayValue = value as Record<string, unknown>
    const normalizedDay = dayMapping[key.toLowerCase()]

    if (!normalizedDay) continue

    // Handle both formats: enabled/start/end AND isOpen/open/close
    const isOpen = dayValue.enabled === true || dayValue.isOpen === true
    const open = (dayValue.start as string) || (dayValue.open as string) || '09:00'
    const close = (dayValue.end as string) || (dayValue.close as string) || '18:00'
    const breaks = dayValue.breaks as Array<{ start: string; end: string }> | undefined

    normalized[normalizedDay] = { open, close, isOpen, breaks }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

function isValidTime(timeStr: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(timeStr)
}

function getDayName(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getUTCDay()]
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
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
    const { tenantId, appointmentId, date, time, notes } = body

    // ============ VALIDATION ============

    // 1. Required fields
    if (!tenantId || !appointmentId || !date || !time) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: tenantId, appointmentId, date, time'
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

    // 3. Date/Time format validation
    if (!isValidDate(date)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidTime(time)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid time format. Use HH:MM' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Date not in the past (timezone Brasil)
    const now = new Date()
    const requestedDateTime = new Date(`${date}T${time}:00${TIMEZONE_OFFSET}`)
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

    const employee = appointment.employees
    const service = appointment.services

    if (!employee || !employee.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Professional is no longer active' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!service || !service.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service is no longer active' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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

    // ============ COMPANY WORKING HOURS VALIDATION ============

    const settings = tenant.settings as Record<string, unknown> | null
    const requestedDate = new Date(`${date}T12:00:00${TIMEZONE_OFFSET}`)
    const dayOfWeek = requestedDate.getUTCDay()
    const dayName = getDayName(requestedDate)

    if (settings) {
      const workingDays = settings.workingDays as number[] | undefined
      if (workingDays && !workingDays.includes(dayOfWeek)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Company is closed on this day' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const openTime = settings.openTime as string | undefined
      const closeTime = settings.closeTime as string | undefined

      if (openTime && closeTime) {
        const requestedMinutes = timeToMinutes(time)
        const openMinutes = timeToMinutes(openTime)
        const closeMinutes = timeToMinutes(closeTime)
        const endMinutes = requestedMinutes + service.duration

        if (requestedMinutes < openMinutes || endMinutes > closeMinutes) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Company operating hours are ${openTime} to ${closeTime}`
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ============ PROFESSIONAL WORKING HOURS VALIDATION ============

    const normalizedHours = normalizeWorkingHours(employee.working_hours)

    if (normalizedHours) {
      const daySchedule = normalizedHours[dayName]

      if (!daySchedule || !daySchedule.isOpen) {
        return new Response(
          JSON.stringify({ success: false, error: 'Professional does not work on this day' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const requestedMinutes = timeToMinutes(time)
      const openMinutes = timeToMinutes(daySchedule.open)
      const closeMinutes = timeToMinutes(daySchedule.close)
      const endMinutes = requestedMinutes + service.duration

      if (requestedMinutes < openMinutes || endMinutes > closeMinutes) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Professional works from ${daySchedule.open} to ${daySchedule.close}`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check breaks
      if (daySchedule.breaks && daySchedule.breaks.length > 0) {
        for (const breakPeriod of daySchedule.breaks) {
          const breakStart = timeToMinutes(breakPeriod.start)
          const breakEnd = timeToMinutes(breakPeriod.end)

          if (
            (requestedMinutes >= breakStart && requestedMinutes < breakEnd) ||
            (endMinutes > breakStart && endMinutes <= breakEnd) ||
            (requestedMinutes <= breakStart && endMinutes >= breakEnd)
          ) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Professional has a break from ${breakPeriod.start} to ${breakPeriod.end}`
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      }
    }

    // ============ CONFLICT CHECK ============

    const newScheduledAt = `${date}T${time}:00${TIMEZONE_OFFSET}`
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
      .not('status', 'in', '("cancelled","no_show")')

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
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Time slot conflicts with another appointment'
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ============ UPDATE APPOINTMENT ============

    const previousScheduledAt = appointment.scheduled_at
    const updateData: Record<string, unknown> = {
      scheduled_at: newScheduledAt,
      updated_at: new Date().toISOString()
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

    const endTime = new Date(appointmentStart.getTime() + service.duration * 60000)
      .toISOString()
      .slice(11, 16)

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
        message: 'Agendamento reagendado com sucesso'
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

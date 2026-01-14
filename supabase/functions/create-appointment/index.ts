import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
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

// Normaliza número de telefone para formato E.164 Brasil
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  
  if (digits.startsWith('55') && digits.length >= 12) {
    return '+' + digits
  }
  
  if (digits.length === 11 || digits.length === 10) {
    return '+55' + digits
  }
  
  return '+' + digits
}

// Valida formato UUID
function isValidUUID(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return regex.test(str)
}

// Valida formato ISO 8601 com timezone
function isValidISO8601(str: string): boolean {
  // Aceita formatos como: 2026-01-14T14:30:00-03:00 ou 2026-01-14T14:30:00Z
  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?$/
  if (!regex.test(str)) return false
  
  const date = new Date(str)
  return !isNaN(date.getTime())
}

// Extrai date (YYYY-MM-DD) e time (HH:MM) de um ISO 8601 string
function parseStartAt(startAt: string): { date: string; time: string } | null {
  try {
    const dateObj = new Date(startAt)
    if (isNaN(dateObj.getTime())) return null
    
    // Extrai data no formato YYYY-MM-DD
    const date = startAt.slice(0, 10)
    
    // Extrai hora no formato HH:MM
    const time = startAt.slice(11, 16)
    
    return { date, time }
  } catch {
    return null
  }
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

    // Parse request body
    let body: {
      tenantId?: string
      phone?: string
      clientName?: string
      serviceId?: string
      professionalId?: string
      startAt?: string  // ISO 8601: 2026-01-14T14:30:00-03:00
      notes?: string
    }

    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { tenantId, phone, clientName, serviceId, professionalId, startAt, notes } = body

    // ============ VALIDATION ============

    // 1. Validate required fields
    const missingFields: string[] = []
    if (!tenantId) missingFields.push('tenantId')
    if (!phone) missingFields.push('phone')
    if (!serviceId) missingFields.push('serviceId')
    if (!professionalId) missingFields.push('professionalId')
    if (!startAt) missingFields.push('startAt')

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate UUID formats
    if (!isValidUUID(tenantId!)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid tenantId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidUUID(serviceId!)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid serviceId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidUUID(professionalId!)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid professionalId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validate startAt format (ISO 8601)
    if (!isValidISO8601(startAt!)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid startAt format. Use ISO 8601 (e.g., 2026-01-14T14:30:00-03:00)' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parse startAt to get date and time
    const parsed = parseStartAt(startAt!)
    if (!parsed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not parse startAt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { date, time } = parsed

    // 5. Validate date is not in the past
    const now = new Date()
    const requestedDateTime = new Date(startAt!)
    if (requestedDateTime < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot schedule appointments in the past' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ TENANT VALIDATION ============

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, status')
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
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SERVICE VALIDATION ============

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration, price, is_active, tenant_id')
      .eq('id', serviceId)
      .eq('tenant_id', tenantId)
      .single()

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service not found for this tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!service.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ PROFESSIONAL VALIDATION ============

    const { data: professional, error: professionalError } = await supabase
      .from('employees')
      .select('id, name, working_hours, is_active, tenant_id')
      .eq('id', professionalId)
      .eq('tenant_id', tenantId)
      .single()

    if (professionalError || !professional) {
      return new Response(
        JSON.stringify({ success: false, error: 'Professional not found for this tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!professional.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'Professional is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ PROFESSIONAL x SERVICE VALIDATION ============

    const { data: employeeService, error: esError } = await supabase
      .from('employee_services')
      .select('id')
      .eq('employee_id', professionalId)
      .eq('service_id', serviceId)
      .single()

    if (esError || !employeeService) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Professional "${professional.name}" is not qualified to perform service "${service.name}"` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ WORKING HOURS VALIDATION ============

    const workingHours = normalizeWorkingHours(professional.working_hours)
    const requestedDate = new Date(date + 'T12:00:00Z')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[requestedDate.getUTCDay()]

    const dayHours = workingHours?.[dayOfWeek]

    if (!dayHours || !dayHours.isOpen) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Professional "${professional.name}" does not work on ${dayOfWeek}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requested time is within working hours
    const [reqHour, reqMin] = time!.split(':').map(Number)
    const [openHour, openMin] = dayHours.open.split(':').map(Number)
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number)

    const reqMinutes = reqHour * 60 + reqMin
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    const endMinutes = reqMinutes + service.duration

    if (reqMinutes < openMinutes) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Requested time ${time} is before professional's start time (${dayHours.open})` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endMinutes > closeMinutes) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Appointment would end after professional's closing time (${dayHours.close}). Service duration: ${service.duration} minutes` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ AVAILABILITY VALIDATION (CONFLICT CHECK) ============

    const scheduledAt = `${date}T${time}:00`
    const appointmentStart = new Date(scheduledAt)
    const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000)

    // Get appointments for the professional on that day
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`

    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, scheduled_at, duration, status')
      .eq('employee_id', professionalId)
      .eq('tenant_id', tenantId)
      .gte('scheduled_at', dayStart)
      .lte('scheduled_at', dayEnd)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for time conflicts
    for (const apt of existingAppointments || []) {
      const aptStart = new Date(apt.scheduled_at)
      const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000)

      // Check if new appointment overlaps with existing one
      if (appointmentStart < aptEnd && appointmentEnd > aptStart) {
        const aptStartTime = aptStart.toTimeString().slice(0, 5)
        const aptEndTime = aptEnd.toTimeString().slice(0, 5)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Time slot conflicts with existing appointment (${aptStartTime} - ${aptEndTime})` 
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============ CLIENT LOOKUP OR CREATE ============

    const normalizedPhone = normalizePhone(phone!)

    // Try to find existing client
    let { data: existingClient } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('phone', normalizedPhone)
      .eq('tenant_id', tenantId)
      .single()

    let clientId: string

    if (existingClient) {
      clientId = existingClient.id
      
      // Update name if provided and client doesn't have one
      if (clientName && !existingClient.name) {
        await supabase
          .from('clients')
          .update({ name: clientName })
          .eq('id', clientId)
      }
    } else {
      // Create new client
      const { data: newClient, error: clientCreateError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenantId,
          phone: normalizedPhone,
          name: clientName || null
        })
        .select('id')
        .single()

      if (clientCreateError || !newClient) {
        console.error('Error creating client:', clientCreateError)
        return new Response(
          JSON.stringify({ success: false, error: 'Error creating client record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      clientId = newClient.id
    }

    // ============ CREATE APPOINTMENT ============

    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        employee_id: professionalId,
        service_id: serviceId,
        scheduled_at: scheduledAt,
        duration: service.duration,
        price: service.price,
        status: 'scheduled',
        payment_status: 'pending',
        notes: notes || null
      })
      .select('id, scheduled_at, duration, status')
      .single()

    if (createError || !appointment) {
      console.error('Error creating appointment:', createError)
      return new Response(
        JSON.stringify({ success: false, error: 'Error creating appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SUCCESS RESPONSE ============

    const endTime = new Date(new Date(scheduledAt).getTime() + service.duration * 60000)
      .toTimeString().slice(0, 5)

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: appointment.id,
          date: date,
          time: time,
          endTime: endTime,
          duration: service.duration,
          status: appointment.status,
          service: {
            id: service.id,
            name: service.name,
            price: service.price
          },
          professional: {
            id: professional.id,
            name: professional.name
          },
          client: {
            id: clientId,
            phone: normalizedPhone,
            name: clientName || existingClient?.name || null,
            isNew: !existingClient
          }
        },
        message: `Appointment scheduled successfully for ${date} at ${time} with ${professional.name}`
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

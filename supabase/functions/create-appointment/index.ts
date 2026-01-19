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

// ============ NORMALIZAÇÃO DE DATA/HORA/FUSO (NOVO) ============

/**
 * Normaliza data do formato DD/MM/YYYY para YYYY-MM-DD
 */
function normalizeDateFormat(dateStr: string): string {
  // Se já está no formato YYYY-MM-DD, retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Se está no formato DD/MM/YYYY, converte
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const day = match[1].padStart(2, '0')
    const month = match[2].padStart(2, '0')
    const year = match[3]
    return `${year}-${month}-${day}`
  }
  
  // Retorna original se não reconhecer
  return dateStr
}

/**
 * Normaliza hora para formato HH:mm
 * Exemplos: "9:00" → "09:00", "15:30" → "15:30"
 */
function normalizeTimeFormat(timeStr: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hour = match[1].padStart(2, '0')
    const minute = match[2]
    return `${hour}:${minute}`
  }
  return timeStr
}

/**
 * Constrói scheduled_at ISO 8601 com offset do Brasil
 */
function buildScheduledAt(date: string, time: string, tzOffset: string = '-03:00'): string {
  const normalizedDate = normalizeDateFormat(date)
  const normalizedTime = normalizeTimeFormat(time)
  return `${normalizedDate}T${normalizedTime}:00${tzOffset}`
}

/**
 * Verifica se scheduled_at é válido e não está no passado
 * Retorna { valid: boolean, error?: string, debug?: object }
 */
function validateScheduledAt(
  scheduledAtIso: string,
  originalDate?: string,
  originalTime?: string,
  tzOffset?: string
): { valid: boolean; error?: string; debug?: object } {
  const scheduledDate = new Date(scheduledAtIso)
  
  if (isNaN(scheduledDate.getTime())) {
    return {
      valid: false,
      error: 'Invalid scheduled_at format',
      debug: {
        received_date: originalDate,
        received_time: originalTime,
        tz_offset: tzOffset,
        normalized_scheduled_at: scheduledAtIso
      }
    }
  }
  
  // Comparar com "agora" no mesmo contexto
  const now = new Date()
  
  if (scheduledDate <= now) {
    return {
      valid: false,
      error: 'Cannot schedule appointments in the past',
      debug: {
        received_date: originalDate,
        received_time: originalTime,
        tz_offset: tzOffset,
        normalized_scheduled_at: scheduledAtIso,
        server_now: now.toISOString(),
        comparison: `${scheduledAtIso} <= ${now.toISOString()}`
      }
    }
  }
  
  return { valid: true }
}

// Valida formato de data YYYY-MM-DD
function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  
  const date = new Date(dateStr + 'T12:00:00Z')
  return !isNaN(date.getTime())
}

// Valida formato de hora HH:MM (aceita H:MM também)
function isValidTime(timeStr: string): boolean {
  const regex = /^([01]?\d|2[0-3]):([0-5]\d)$/
  return regex.test(timeStr)
}

// Valida formato UUID
function isValidUUID(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return regex.test(str)
}

// Extrai data YYYY-MM-DD de um ISO string
function extractDateFromIso(isoString: string): string {
  return isoString.slice(0, 10)
}

// Extrai hora HH:mm de um ISO string
function extractTimeFromIso(isoString: string): string {
  return isoString.slice(11, 16)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    let body: {
      // Novo formato (prioridade)
      scheduled_at?: string
      // Formato legado
      tenantId?: string
      client?: {
        phone?: string
        name?: string
      }
      // Suporte a customerId (alternativa a client.phone)
      customerId?: string
      serviceId?: string
      professionalId?: string
      date?: string
      time?: string
      tz_offset?: string
      notes?: string
    }

    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { tenantId, client, customerId, serviceId, professionalId, notes } = body
    let { scheduled_at, date, time, tz_offset } = body

    // ============ NORMALIZAÇÃO DE DATA/HORA ============
    
    // Default timezone: Brasil (-03:00)
    const tzOffset = tz_offset || '-03:00'
    
    // Prioridade: scheduled_at > date + time
    if (scheduled_at) {
      // Se scheduled_at foi enviado, usar diretamente
      // Extrair date e time para validações posteriores
      date = extractDateFromIso(scheduled_at)
      time = extractTimeFromIso(scheduled_at)
    } else if (date && time) {
      // Normalizar data (DD/MM/YYYY → YYYY-MM-DD)
      date = normalizeDateFormat(date)
      // Normalizar hora (9:00 → 09:00)
      time = normalizeTimeFormat(time)
      // Construir scheduled_at com fuso
      scheduled_at = buildScheduledAt(date, time, tzOffset)
    }

    // ============ VALIDATION ============

    // 1. Validate required fields
    const missingFields: string[] = []
    if (!tenantId) missingFields.push('tenantId')
    if (!client?.phone && !customerId) missingFields.push('client.phone or customerId')
    if (!serviceId) missingFields.push('serviceId')
    if (!professionalId) missingFields.push('professionalId')
    if (!scheduled_at && (!date || !time)) missingFields.push('scheduled_at or (date + time)')

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate UUID formats
    if (!isValidUUID(tenantId!)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid tenantId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidUUID(serviceId!)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid serviceId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidUUID(professionalId!)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid professionalId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (customerId && !isValidUUID(customerId)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid customerId format (must be UUID)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Validate date format (já normalizado)
    if (!isValidDate(date!)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Validate time format (já normalizado)
    if (!isValidTime(time!)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid time format. Use HH:mm or H:mm (24h)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Validate date is not in the past (APÓS normalização)
    const dateTimeValidation = validateScheduledAt(
      scheduled_at!,
      body.date, // original
      body.time, // original
      tzOffset
    )
    
    if (!dateTimeValidation.valid) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: dateTimeValidation.error,
          debug: dateTimeValidation.debug
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ TENANT VALIDATION ============

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, status, settings')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (tenant.status !== 'active') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Tenant is not active' }),
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
        JSON.stringify({ ok: false, error: 'Service not found for this tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!service.is_active) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Service is not active' }),
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
        JSON.stringify({ ok: false, error: 'Professional not found for this tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!professional.is_active) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Professional is not active' }),
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
          ok: false, 
          error: `Professional "${professional.name}" is not qualified to perform service "${service.name}"` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ COMPANY HOURS VALIDATION ============
    
    // Mapeamento de dia da semana para chave PT-BR
    const dayMappingEnToPt: Record<string, string> = {
      'sunday': 'dom', 'monday': 'seg', 'tuesday': 'ter', 'wednesday': 'qua',
      'thursday': 'qui', 'friday': 'sex', 'saturday': 'sab'
    }
    
    const requestedDate = new Date(date + 'T12:00:00Z')
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[requestedDate.getUTCDay()]
    const dayKeyPt = dayMappingEnToPt[dayOfWeek]
    
    // Extrair configurações da empresa
    const tenantSettings = (tenant as Record<string, unknown>)?.settings as Record<string, unknown> || {}
    const companyOpenTime = (tenantSettings.openTime as string) || '09:00'
    const companyCloseTime = (tenantSettings.closeTime as string) || '19:00'
    const companyWorkingDays = (tenantSettings.workingDays as string[]) || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    
    // Verificar se empresa funciona neste dia
    if (!companyWorkingDays.includes(dayKeyPt)) {
      const dayLabels: Record<string, string> = {
        'dom': 'Domingo', 'seg': 'Segunda', 'ter': 'Terça', 'qua': 'Quarta',
        'qui': 'Quinta', 'sex': 'Sexta', 'sab': 'Sábado'
      }
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Empresa não funciona neste dia (${dayLabels[dayKeyPt] || dayOfWeek})` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Verificar se horário está dentro do expediente da empresa
    const [reqHour, reqMin] = time!.split(':').map(Number)
    const reqMinutes = reqHour * 60 + reqMin
    
    const [companyOpenH, companyOpenM] = companyOpenTime.split(':').map(Number)
    const [companyCloseH, companyCloseM] = companyCloseTime.split(':').map(Number)
    const companyOpenMins = companyOpenH * 60 + companyOpenM
    const companyCloseMins = companyCloseH * 60 + companyCloseM
    
    if (reqMinutes < companyOpenMins) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Horário ${time} é antes da abertura da empresa (${companyOpenTime})` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Calcular horário de término para validar contra fechamento da empresa
    const serviceEndMinutes = reqMinutes + service.duration
    
    if (serviceEndMinutes > companyCloseMins) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Agendamento terminaria após fechamento da empresa (${companyCloseTime}). Duração do serviço: ${service.duration} minutos` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ WORKING HOURS VALIDATION (PROFESSIONAL) ============

    const workingHours = normalizeWorkingHours(professional.working_hours)

    const dayHours = workingHours?.[dayOfWeek]

    if (!dayHours || !dayHours.isOpen) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Profissional "${professional.name}" não trabalha neste dia` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requested time is within professional's working hours
    const [openHour, openMin] = dayHours.open.split(':').map(Number)
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number)

    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    const endMinutes = reqMinutes + service.duration

    if (reqMinutes < openMinutes) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Horário ${time} é antes do início do expediente do profissional (${dayHours.open})` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (endMinutes > closeMinutes) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Agendamento terminaria após fim do expediente do profissional (${dayHours.close}). Duração do serviço: ${service.duration} minutos` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ AVAILABILITY VALIDATION (CONFLICT CHECK) ============

    const appointmentStart = new Date(scheduled_at!)
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
        JSON.stringify({ ok: false, error: 'Error checking availability' }),
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
            ok: false, 
            error: `Time slot conflicts with existing appointment (${aptStartTime} - ${aptEndTime})` 
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ============ CLIENT LOOKUP OR CREATE ============

    let clientId: string
    let clientData: { id: string; name: string | null; phone: string | null; isNew: boolean }

    if (customerId) {
      // Se customerId foi enviado, usar diretamente
      const { data: existingClient, error: clientError } = await supabase
        .from('clients')
        .select('id, name, phone')
        .eq('id', customerId)
        .eq('tenant_id', tenantId)
        .single()

      if (clientError || !existingClient) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Customer not found for this tenant' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      clientId = existingClient.id
      clientData = {
        id: existingClient.id,
        name: existingClient.name,
        phone: existingClient.phone,
        isNew: false
      }
    } else {
      // Usar client.phone para buscar/criar
      const normalizedPhone = normalizePhone(client!.phone!)

      // Try to find existing client
      let { data: existingClient } = await supabase
        .from('clients')
        .select('id, name, phone')
        .eq('phone', normalizedPhone)
        .eq('tenant_id', tenantId)
        .single()

      if (existingClient) {
        clientId = existingClient.id
        
        // Update name if provided and client doesn't have one
        if (client?.name && !existingClient.name) {
          await supabase
            .from('clients')
            .update({ name: client.name })
            .eq('id', clientId)
        }

        clientData = {
          id: existingClient.id,
          name: client?.name || existingClient.name,
          phone: normalizedPhone,
          isNew: false
        }
      } else {
        // Create new client
        const { data: newClient, error: clientCreateError } = await supabase
          .from('clients')
          .insert({
            tenant_id: tenantId,
            phone: normalizedPhone,
            name: client?.name || null
          })
          .select('id')
          .single()

        if (clientCreateError || !newClient) {
          console.error('Error creating client:', clientCreateError)
          return new Response(
            JSON.stringify({ ok: false, error: 'Error creating client record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        clientId = newClient.id
        clientData = {
          id: newClient.id,
          name: client?.name || null,
          phone: normalizedPhone,
          isNew: true
        }
      }
    }

    // ============ CREATE APPOINTMENT ============

    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        employee_id: professionalId,
        service_id: serviceId,
        scheduled_at: scheduled_at,
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
        JSON.stringify({ ok: false, error: 'Error creating appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SUCCESS RESPONSE ============

    const endTime = new Date(new Date(scheduled_at!).getTime() + service.duration * 60000)
      .toTimeString().slice(0, 5)

    return new Response(
      JSON.stringify({
        ok: true,
        appointment: {
          id: appointment.id,
          scheduled_at: scheduled_at,
          date: date,
          time: time,
          endTime: endTime,
          duration: service.duration,
          status: appointment.status,
          tenantId: tenantId,
          professionalId: professionalId,
          serviceId: serviceId,
          customerId: clientId,
          service: {
            id: service.id,
            name: service.name,
            price: service.price
          },
          professional: {
            id: professional.id,
            name: professional.name
          },
          client: clientData
        },
        message: `Agendamento criado com sucesso para ${date} às ${time} com ${professional.name}`
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

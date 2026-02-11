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
function parseDateTimeParam(dateTimeStr: string): { date: string; time: string; isoString: string } | null {
  try {
    const parsedDate = new Date(dateTimeStr)
    if (isNaN(parsedDate.getTime())) {
      return null
    }

    // Ajustar UTC para São Paulo (UTC-3)
    const spTime = new Date(parsedDate.getTime() - 3 * 60 * 60 * 1000)
    const date = spTime.toISOString().split('T')[0]
    const hours = spTime.getUTCHours().toString().padStart(2, '0')
    const minutes = spTime.getUTCMinutes().toString().padStart(2, '0')
    const time = `${hours}:${minutes}`

    // Gera ISO string padronizada com timezone
    const isoString = `${date}T${time}:00${TIMEZONE_OFFSET}`

    return { date, time, isoString }
  } catch {
    return null
  }
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
    // Skip non-day keys (e.g., 'breaks' config)
    if (key === 'breaks') continue

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

// Normaliza número de telefone para formato Brasil (sem sinal de +)
// Apenas adiciona DDI 55 se necessário, não manipula o 9º dígito
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Já tem DDI 55 e tamanho correto
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }

  // Telefone brasileiro sem DDI (10 ou 11 dígitos)
  if (digits.length === 11 || digits.length === 10) {
    return '55' + digits
  }

  return digits
}

// Valida formato UUID
function isValidUUID(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return regex.test(str)
}

// Formata horário em São Paulo (UTC-3) a partir de ISO string
function formatTimeInSaoPaulo(isoString: string): string {
  const date = new Date(isoString)
  // Ajustar UTC para São Paulo (UTC-3)
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
      JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body first to get tenantId for validation
    let body: {
      tenantId?: string
      clientPhone?: string
      clientName?: string
      serviceId?: string
      serviceIds?: string[]
      professionalId?: string
      services?: { serviceId: string; professionalId: string }[]
      dateTime?: string
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

    const { tenantId, clientPhone, clientName, serviceId, serviceIds, professionalId, services: servicesInput, dateTime, notes } = body

    // Normalizar entrada: aceita 3 formatos
    // 1. services: [{ serviceId, professionalId }] (novo - profissional por serviço)
    // 2. serviceIds: [...] + professionalId (array com profissional global)
    // 3. serviceId + professionalId (legado)
    let serviceEmployeeMap: { serviceId: string; professionalId: string }[] = []

    if (servicesInput && Array.isArray(servicesInput) && servicesInput.length > 0) {
      // Novo formato: per-service professional
      serviceEmployeeMap = servicesInput
    } else {
      const legacyServiceIds: string[] = serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0
        ? serviceIds
        : serviceId
          ? [serviceId]
          : []
      // Legado: all services use the same professionalId
      if (professionalId) {
        serviceEmployeeMap = legacyServiceIds.map(sId => ({ serviceId: sId, professionalId: professionalId! }))
      } else if (legacyServiceIds.length > 0) {
        serviceEmployeeMap = legacyServiceIds.map(sId => ({ serviceId: sId, professionalId: '' }))
      }
    }

    const serviceIdsList = serviceEmployeeMap.map(s => s.serviceId)

    // ============ VALIDATION ============

    // 1. Validate required fields
    const missingFields: string[] = []
    if (!tenantId) missingFields.push('tenantId')
    if (!clientPhone) missingFields.push('clientPhone')
    if (serviceIdsList.length === 0) missingFields.push('serviceId, serviceIds, or services')
    if (serviceEmployeeMap.some(s => !s.professionalId)) missingFields.push('professionalId for each service')
    if (!dateTime) missingFields.push('dateTime')

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

    // ============ API KEY VALIDATION ============

    const agentKey = req.headers.get('x-agent-key')
    const keyValidation = await validateAgentKey(supabase, agentKey || '', tenantId!)
    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: 'unauthorized', message: keyValidation.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate all serviceIds and professionalIds are valid UUIDs
    for (const entry of serviceEmployeeMap) {
      if (!isValidUUID(entry.serviceId)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid serviceId format: ${entry.serviceId} (must be UUID)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!isValidUUID(entry.professionalId)) {
        return new Response(
          JSON.stringify({ success: false, error: `Invalid professionalId format: ${entry.professionalId} (must be UUID)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 3. Parse and validate dateTime (ISO 8601 format)
    const parsedDateTime = parseDateTimeParam(dateTime!)
    if (!parsedDateTime) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid dateTime format. Use ISO 8601 (e.g., 2026-01-27T14:00:00-03:00)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { date, time, isoString: scheduledAt } = parsedDateTime

    // 4. Validate date is not in the past
    const now = new Date()
    const requestedDateTime = new Date(scheduledAt)
    if (requestedDateTime < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot schedule appointments in the past' }),
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

    // ============ SERVICES VALIDATION ============

    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration, price, is_active, tenant_id')
      .in('id', serviceIdsList)
      .eq('tenant_id', tenantId)

    if (servicesError || !services || services.length !== serviceIdsList.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'One or more services not found for this tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check all services are active
    for (const svc of services) {
      if (!svc.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: `Service "${svc.name}" is not active` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Calculate totals
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
    const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)

    // ============ PROFESSIONALS VALIDATION ============

    const uniqueProfessionalIds = [...new Set(serviceEmployeeMap.map(s => s.professionalId))]

    const { data: professionals, error: professionalsError } = await supabase
      .from('employees')
      .select('id, name, working_hours, is_active, tenant_id')
      .in('id', uniqueProfessionalIds)
      .eq('tenant_id', tenantId)

    if (professionalsError || !professionals || professionals.length !== uniqueProfessionalIds.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'One or more professionals not found for this tenant' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    for (const prof of professionals) {
      if (!prof.is_active) {
        return new Response(
          JSON.stringify({ success: false, error: `Professional "${prof.name}" is not active` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const professionalsMap = new Map(professionals.map(p => [p.id, p]))

    // ============ PROFESSIONAL x SERVICES VALIDATION (per-service) ============

    // Fetch all employee_services for all professionals
    const { data: employeeServices, error: esError } = await supabase
      .from('employee_services')
      .select('employee_id, service_id')
      .in('employee_id', uniqueProfessionalIds)
      .in('service_id', serviceIdsList)

    if (esError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Error validating professional services' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build a set of "empId:svcId" for quick lookup
    const qualifiedPairs = new Set(employeeServices?.map(es => `${es.employee_id}:${es.service_id}`) || [])
    for (const entry of serviceEmployeeMap) {
      if (!qualifiedPairs.has(`${entry.professionalId}:${entry.serviceId}`)) {
        const prof = professionalsMap.get(entry.professionalId)
        const svc = services.find(s => s.id === entry.serviceId)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Professional "${prof?.name || 'Unknown'}" is not qualified to perform service "${svc?.name || 'Unknown'}"`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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
          success: false, 
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
          success: false, 
          error: `Horário ${time} é antes da abertura da empresa (${companyOpenTime})` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Calcular horário de término para validar contra fechamento da empresa
    const serviceEndMinutes = reqMinutes + totalDuration

    if (serviceEndMinutes > companyCloseMins) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Agendamento terminaria após fechamento da empresa (${companyCloseTime}). Duração total dos serviços: ${totalDuration} minutos`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ WORKING HOURS VALIDATION (ALL PROFESSIONALS) ============

    const endMinutes = reqMinutes + totalDuration

    for (const prof of professionals) {
      const workingHours = normalizeWorkingHours(prof.working_hours)
      const dayHours = workingHours?.[dayOfWeek]

      if (!dayHours || !dayHours.isOpen) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Profissional "${prof.name}" não trabalha neste dia`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const [openHour, openMin] = dayHours.open.split(':').map(Number)
      const [closeHour, closeMin] = dayHours.close.split(':').map(Number)
      const openMinutes = openHour * 60 + openMin
      const closeMinutes = closeHour * 60 + closeMin

      if (reqMinutes < openMinutes) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Horário ${time} é antes do início do expediente de ${prof.name} (${dayHours.open})`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (endMinutes > closeMinutes) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Agendamento terminaria após fim do expediente de ${prof.name} (${dayHours.close}). Duração total: ${totalDuration} min`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Break validation per professional
      // working_hours.breaks.breaks is the array of break periods
      // Parse more defensively to avoid silent failures in Deno runtime
      let breaks: Array<{ start: string; end: string; label?: string }> = []
      try {
        const rawWH = prof.working_hours as Record<string, unknown> | null
        if (rawWH && typeof rawWH === 'object') {
          const breaksObj = rawWH['breaks'] as Record<string, unknown> | undefined
          if (breaksObj && typeof breaksObj === 'object') {
            const breaksArr = breaksObj['breaks']
            if (Array.isArray(breaksArr)) {
              breaks = breaksArr as Array<{ start: string; end: string; label?: string }>
            }
          }
        }
      } catch (e) {
        console.error(`Error parsing breaks for ${prof.name}:`, e)
      }

      console.log(`[BREAK-CHECK] ${prof.name}: found ${breaks.length} breaks, appointment ${reqMinutes}-${endMinutes} min`)

      for (const breakPeriod of breaks) {
        const [breakStartH, breakStartM] = breakPeriod.start.split(':').map(Number)
        const [breakEndH, breakEndM] = breakPeriod.end.split(':').map(Number)
        const breakStartMins = breakStartH * 60 + breakStartM
        const breakEndMins = breakEndH * 60 + breakEndM

        console.log(`[BREAK-CHECK] ${prof.name}: break ${breakPeriod.start}-${breakPeriod.end} (${breakStartMins}-${breakEndMins}), apt ${reqMinutes}-${endMinutes}, overlap=${reqMinutes < breakEndMins && endMinutes > breakStartMins}`)

        if (reqMinutes < breakEndMins && endMinutes > breakStartMins) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Horário conflita com intervalo de ${prof.name} (${breakPeriod.start} - ${breakPeriod.end}${breakPeriod.label ? ': ' + breakPeriod.label : ''})`
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ============ AVAILABILITY VALIDATION (CONFLICT CHECK FOR ALL PROFESSIONALS) ============

    const appointmentStart = new Date(scheduledAt)
    const appointmentEnd = new Date(appointmentStart.getTime() + totalDuration * 60000)

    const dayStart = `${date}T00:00:00${TIMEZONE_OFFSET}`
    const dayEnd = `${date}T23:59:59${TIMEZONE_OFFSET}`

    // Check conflicts for each professional
    // Query both appointments.employee_id (legacy) and appointment_services.employee_id (per-service)
    for (const profId of uniqueProfessionalIds) {
      const prof = professionalsMap.get(profId)!

      // 1. Appointments where this professional is the primary employee (legacy field)
      const { data: legacyAppointments, error: legacyError } = await supabase
        .from('appointments')
        .select('id, scheduled_at, duration, status')
        .eq('employee_id', profId)
        .eq('tenant_id', tenantId)
        .gte('scheduled_at', dayStart)
        .lte('scheduled_at', dayEnd)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])

      if (legacyError) {
        console.error('Error fetching legacy appointments:', legacyError)
        return new Response(
          JSON.stringify({ success: false, error: 'Error checking availability' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 2. Appointments where this professional is assigned via appointment_services
      const { data: asAppointments, error: asError } = await supabase
        .from('appointment_services')
        .select('appointment_id, appointments!inner(id, scheduled_at, duration, status, tenant_id)')
        .eq('employee_id', profId)
        .eq('appointments.tenant_id', tenantId)
        .gte('appointments.scheduled_at', dayStart)
        .lte('appointments.scheduled_at', dayEnd)
        .in('appointments.status', ['scheduled', 'confirmed', 'in_progress'])

      if (asError) {
        console.error('Error fetching appointment_services conflicts:', asError)
        return new Response(
          JSON.stringify({ success: false, error: 'Error checking availability' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Merge and deduplicate by appointment ID
      const allConflictAppointments = new Map<string, { id: string; scheduled_at: string; duration: number; status: string }>()

      for (const apt of legacyAppointments || []) {
        allConflictAppointments.set(apt.id, apt)
      }

      for (const asApt of asAppointments || []) {
        const apt = (asApt as any).appointments as { id: string; scheduled_at: string; duration: number; status: string }
        if (apt && !allConflictAppointments.has(apt.id)) {
          allConflictAppointments.set(apt.id, apt)
        }
      }

      for (const apt of allConflictAppointments.values()) {
        const aptStart = new Date(apt.scheduled_at)
        const aptEnd = new Date(aptStart.getTime() + (apt.duration || 30) * 60000)

        if (appointmentStart < aptEnd && appointmentEnd > aptStart) {
          const aptStartTime = formatTimeInSaoPaulo(aptStart.toISOString())
          const aptEndTime = formatTimeInSaoPaulo(aptEnd.toISOString())
          return new Response(
            JSON.stringify({
              success: false,
              error: `${prof.name} has a conflicting appointment (${aptStartTime} - ${aptEndTime})`
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ============ CLIENT LOOKUP OR CREATE ============

    const normalizedPhone = normalizePhone(clientPhone!)

    // Try to find existing client
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, name, phone, is_lead')
      .eq('phone', normalizedPhone)
      .eq('tenant_id', tenantId)
      .single()

    let clientId: string

    if (existingClient) {
      clientId = existingClient.id

      // Build update object
      const updates: Record<string, unknown> = {}

      // Update name if provided and client doesn't have one
      if (clientName && !existingClient.name) {
        updates.name = clientName
      }

      // Promote lead to client when appointment is created
      if (existingClient.is_lead) {
        updates.is_lead = false
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('clients')
          .update(updates)
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
        employee_id: uniqueProfessionalIds[0], // Backward compatibility: first professional
        service_id: services[0].id, // Backward compatibility: first service
        scheduled_at: scheduledAt,
        duration: totalDuration,
        price: totalPrice,
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

    // ============ INSERT APPOINTMENT SERVICES ============

    // Build a map from serviceId to professionalId for easy lookup
    const svcToProfMap = new Map(serviceEmployeeMap.map(s => [s.serviceId, s.professionalId]))

    const appointmentServicesData = services.map((svc, index) => ({
      appointment_id: appointment.id,
      service_id: svc.id,
      employee_id: svcToProfMap.get(svc.id) || uniqueProfessionalIds[0],
      price: svc.price,
      duration: svc.duration,
      sort_order: index
    }))

    const { error: asInsertError } = await supabase
      .from('appointment_services')
      .insert(appointmentServicesData)

    if (asInsertError) {
      console.error('Error inserting appointment_services:', asInsertError)
      // Rollback: deletar o appointment criado
      await supabase.from('appointments').delete().eq('id', appointment.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Error linking services to appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SUCCESS RESPONSE ============

    const endDateTime = new Date(new Date(scheduledAt).getTime() + totalDuration * 60000)
    const endTime = formatTimeInSaoPaulo(endDateTime.toISOString())

    const serviceNames = services.map(s => s.name).join(', ')

    const profNames = [...new Set(professionals.map(p => p.name))].join(', ')

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: appointment.id,
          date: date,
          time: time,
          endTime: endTime,
          duration: totalDuration,
          totalPrice: totalPrice,
          status: appointment.status,
          services: services.map(s => {
            const profId = svcToProfMap.get(s.id)
            const prof = profId ? professionalsMap.get(profId) : null
            return {
              id: s.id,
              name: s.name,
              price: s.price,
              duration: s.duration,
              professional: prof ? { id: prof.id, name: prof.name } : null
            }
          }),
          professionals: professionals.map(p => ({
            id: p.id,
            name: p.name
          })),
          client: {
            id: clientId,
            phone: normalizedPhone,
            name: clientName || existingClient?.name || null,
            isNew: !existingClient
          }
        },
        message: `Appointment scheduled successfully for ${date} at ${time} with ${profNames}. Services: ${serviceNames}`
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get phone number and tenantId from request
    const { phone, tenantId } = await req.json()

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId is required for tenant isolation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tenantId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tenantId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize phone number (remove non-numeric characters)
    const normalizedPhone = phone.replace(/\D/g, '')

    // Find client by phone number within the specific tenant
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${phone}%`)
      .maybeSingle()

    if (clientError) {
      console.error('Error fetching client:', clientError)
      return new Response(
        JSON.stringify({ error: 'Error fetching client data', details: clientError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!client) {
      return new Response(
        JSON.stringify({ error: 'Client not found', phone: normalizedPhone }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch tenant (establishment) data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', client.tenant_id)
      .single()

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError)
      return new Response(
        JSON.stringify({ error: 'Error fetching establishment data', details: tenantError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch employees for the tenant
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('tenant_id', client.tenant_id)
      .eq('is_active', true)

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
    }

    // Fetch services for the tenant
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', client.tenant_id)
      .eq('is_active', true)

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
    }

    // Get today's date and next 7 days for occupied slots
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Fetch upcoming appointments (occupied slots)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        duration,
        status,
        employee_id,
        service_id
      `)
      .eq('tenant_id', client.tenant_id)
      .gte('scheduled_at', today.toISOString())
      .lte('scheduled_at', nextWeek.toISOString())
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true })

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
    }

    // Parse working hours from tenant settings
    const workingHours = tenant?.settings?.workingHours || {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '13:00', isOpen: true },
      sunday: { open: '00:00', close: '00:00', isOpen: false },
    }

    // Format occupied slots with more details
    const occupiedSlots = (appointments || []).map(apt => {
      const startTime = new Date(apt.scheduled_at)
      const endTime = new Date(startTime.getTime() + (apt.duration || 30) * 60000)
      
      return {
        id: apt.id,
        date: startTime.toISOString().split('T')[0],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        employee_id: apt.employee_id,
        service_id: apt.service_id,
        status: apt.status,
      }
    })

    // Build response
    const response = {
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        cpf: client.cpf,
        address: client.address,
        birth_date: client.birth_date,
        notes: client.notes,
        total_visits: client.total_visits,
        last_visit: client.last_visit,
        created_at: client.created_at,
      },
      establishment: {
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        cnpj: tenant.cnpj,
        logo_url: tenant.logo_url,
        status: tenant.status,
        settings: tenant.settings,
        working_hours: workingHours,
        employees: employees || [],
        services: services || [],
      },
      schedule: {
        working_hours: workingHours,
        occupied_slots: occupiedSlots,
        next_7_days: {
          from: today.toISOString().split('T')[0],
          to: nextWeek.toISOString().split('T')[0],
        },
      },
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
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

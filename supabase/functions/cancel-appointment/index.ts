import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============ UTILITY FUNCTIONS ============

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
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
    const { tenantId, appointmentId, reason } = body

    // ============ VALIDATION ============

    // 1. Required fields
    if (!tenantId || !appointmentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: tenantId, appointmentId'
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

    // ============ SUPABASE CLIENT ============

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ============ FETCH APPOINTMENT ============

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        employees (id, name),
        services (id, name, duration, price),
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

    // 3. Status validation - cannot cancel completed/cancelled/no_show
    const nonCancellableStatuses = ['completed', 'cancelled', 'no_show']
    if (nonCancellableStatuses.includes(appointment.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot cancel appointment with status: ${appointment.status}`
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ UPDATE APPOINTMENT ============

    // Build notes with cancellation reason
    let updatedNotes = appointment.notes || ''
    if (reason) {
      const timestamp = new Date().toISOString()
      const cancellationNote = `[Cancelado em ${timestamp}] Motivo: ${reason}`
      updatedNotes = updatedNotes 
        ? `${updatedNotes}\n\n${cancellationNote}` 
        : cancellationNote
    }

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error cancelling appointment:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to cancel appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============ SUCCESS RESPONSE ============

    // Extract date and time from scheduled_at
    const scheduledAt = new Date(appointment.scheduled_at)
    const date = scheduledAt.toISOString().slice(0, 10)
    const time = scheduledAt.toISOString().slice(11, 16)

    return new Response(
      JSON.stringify({
        success: true,
        appointment: {
          id: updatedAppointment.id,
          scheduledAt: appointment.scheduled_at,
          date,
          time,
          status: 'cancelled',
          previousStatus: appointment.status,
          reason: reason || null,
          cancelledAt: new Date().toISOString(),
          professional: appointment.employees ? {
            id: appointment.employees.id,
            name: appointment.employees.name
          } : null,
          client: appointment.clients ? {
            id: appointment.clients.id,
            name: appointment.clients.name,
            phone: appointment.clients.phone
          } : null,
          service: appointment.services ? {
            id: appointment.services.id,
            name: appointment.services.name,
            duration: appointment.services.duration,
            price: appointment.services.price
          } : null
        },
        message: 'Agendamento cancelado com sucesso'
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

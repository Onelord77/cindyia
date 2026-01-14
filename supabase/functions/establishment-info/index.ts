import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
};

// Default working hours structure
const defaultWorkingHours = {
  monday: { open: null, close: null, isOpen: false },
  tuesday: { open: null, close: null, isOpen: false },
  wednesday: { open: null, close: null, isOpen: false },
  thursday: { open: null, close: null, isOpen: false },
  friday: { open: null, close: null, isOpen: false },
  saturday: { open: null, close: null, isOpen: false },
  sunday: { open: null, close: null, isOpen: false },
};

const dayIndexToName: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Get query parameters
    const tenantId = url.searchParams.get('tenantId');

    // Validate required parameters
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tenantId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, address, phone, email, settings')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Error fetching tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Establishment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse settings for working hours and policies
    const settings = tenant.settings || {};
    
    // Build working hours from settings
    const workingHours = { ...defaultWorkingHours };
    
    // Check if settings has workingDays array and openTime/closeTime
    if (settings.workingDays && Array.isArray(settings.workingDays)) {
      const openTime = settings.openTime || '09:00';
      const closeTime = settings.closeTime || '18:00';
      
      settings.workingDays.forEach((dayIndex: number) => {
        const dayName = dayIndexToName[dayIndex];
        if (dayName) {
          workingHours[dayName as keyof typeof workingHours] = {
            open: openTime,
            close: closeTime,
            isOpen: true,
          };
        }
      });
    }

    // Check for detailed working hours in settings
    if (settings.workingHours && typeof settings.workingHours === 'object') {
      Object.keys(settings.workingHours).forEach((day) => {
        const dayData = settings.workingHours[day];
        if (dayData && typeof dayData === 'object') {
          workingHours[day as keyof typeof workingHours] = {
            open: dayData.open || null,
            close: dayData.close || null,
            isOpen: dayData.isOpen ?? false,
          };
        }
      });
    }

    // Extract policies (only safe, non-sensitive data)
    const policies = {
      cancellation: settings.cancellationPolicy?.text || 
                   (settings.cancellationPolicy?.allowCancellation 
                     ? `Cancelamento permitido até ${settings.cancellationPolicy.minHoursBeforeCancel || 2}h antes` 
                     : null),
      late: settings.latePolicy || null,
    };

    // Build response (excluding sensitive data)
    const response = {
      tenantId: tenant.id,
      name: tenant.name,
      address: tenant.address || null,
      phone: tenant.phone || null,
      email: tenant.email || null,
      timezone: settings.timezone || 'America/Sao_Paulo',
      workingHours,
      policies,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

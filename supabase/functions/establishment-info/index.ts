import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
};

// Working hours type
type DayHours = { open: string | null; close: string | null; isOpen: boolean };
type WorkingHoursMap = Record<string, DayHours>;

// Default working hours structure
const createDefaultWorkingHours = (): WorkingHoursMap => ({
  monday: { open: null, close: null, isOpen: false },
  tuesday: { open: null, close: null, isOpen: false },
  wednesday: { open: null, close: null, isOpen: false },
  thursday: { open: null, close: null, isOpen: false },
  friday: { open: null, close: null, isOpen: false },
  saturday: { open: null, close: null, isOpen: false },
  sunday: { open: null, close: null, isOpen: false },
});

// Map numeric day index to English day name
const dayIndexToName: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// Map Portuguese abbreviations to English day names
const ptDayToEnglish: Record<string, string> = {
  'dom': 'sunday',
  'seg': 'monday',
  'ter': 'tuesday',
  'qua': 'wednesday',
  'qui': 'thursday',
  'sex': 'friday',
  'sab': 'saturday',
};

// Calculate earliest open and latest close times across all days
const calculateBusinessHours = (hours: WorkingHoursMap): { earliestOpen: string | null; latestClose: string | null } => {
  let earliestOpen: string | null = null;
  let latestClose: string | null = null;
  
  Object.values(hours).forEach((day) => {
    if (day.isOpen && day.open && day.close) {
      if (!earliestOpen || day.open < earliestOpen) {
        earliestOpen = day.open;
      }
      if (!latestClose || day.close > latestClose) {
        latestClose = day.close;
      }
    }
  });
  
  return { earliestOpen, latestClose };
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
    const workingHours: WorkingHoursMap = createDefaultWorkingHours();
    
    // Check if settings has workingDays array and openTime/closeTime
    if (settings.workingDays && Array.isArray(settings.workingDays)) {
      const openTime = settings.openTime || '09:00';
      const closeTime = settings.closeTime || '18:00';
      
      settings.workingDays.forEach((day: number | string) => {
        let dayName: string | undefined;
        
        // Handle numeric index (0-6)
        if (typeof day === 'number') {
          dayName = dayIndexToName[day];
        } 
        // Handle Portuguese abbreviation (seg, ter, qua, etc.)
        else if (typeof day === 'string') {
          dayName = ptDayToEnglish[day.toLowerCase()];
        }
        
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

    // Fallback: If no working hours found, try to get from an admin employee
    const hasWorkingHours = Object.values(workingHours).some((day: DayHours) => day.isOpen);
    
    if (!hasWorkingHours) {
      const { data: employees } = await supabase
        .from('employees')
        .select('working_hours')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      
      const firstEmployee = employees?.[0];
      
      if (firstEmployee?.working_hours && typeof firstEmployee.working_hours === 'object') {
        const empHours = firstEmployee.working_hours as Record<string, { start?: string; end?: string; enabled?: boolean }>;
        Object.keys(empHours).forEach((day) => {
          const dayData = empHours[day];
          if (dayData && typeof dayData === 'object') {
            // Map Portuguese day names to English if needed
            const englishDay = ptDayToEnglish[day.toLowerCase()] || day.toLowerCase();
            if (englishDay in workingHours) {
              workingHours[englishDay as keyof typeof workingHours] = {
                open: dayData.start || null,
                close: dayData.end || null,
                isOpen: dayData.enabled ?? false,
              };
            }
          }
        });
      }
    }

    // Extract policies (only safe, non-sensitive data)
    const policies = {
      cancellation: settings.cancellationPolicy?.text || 
                   (settings.cancellationPolicy?.allowCancellation 
                     ? `Cancelamento permitido até ${settings.cancellationPolicy.minHoursBeforeCancel || 2}h antes` 
                     : null),
      late: settings.latePolicy || null,
    };

    // Calculate business hours summary
    const { earliestOpen, latestClose } = calculateBusinessHours(workingHours);

    // Build response (excluding sensitive data)
    const response = {
      tenantId: tenant.id,
      name: tenant.name,
      address: tenant.address || null,
      phone: tenant.phone || null,
      email: tenant.email || null,
      timezone: settings.timezone || 'America/Sao_Paulo',
      earliestOpen,
      latestClose,
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

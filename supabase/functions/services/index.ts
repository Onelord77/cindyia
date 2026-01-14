import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-key',
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
    const activeParam = url.searchParams.get('active');
    const category = url.searchParams.get('category');
    const q = url.searchParams.get('q');

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

    // Build query
    let query = supabase
      .from('services')
      .select('id, name, duration, price, category, is_active')
      .eq('tenant_id', tenantId);

    // Filter by active status (default: true)
    const filterActive = activeParam !== 'false';
    if (filterActive) {
      query = query.eq('is_active', true);
    }

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by name (search) if provided
    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    // Order by category and name
    query = query.order('category', { ascending: true, nullsFirst: false })
                 .order('name', { ascending: true });

    const { data: services, error } = await query;

    if (error) {
      console.error('Error fetching services:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch services' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map to response format
    const formattedServices = (services || []).map(service => ({
      id: service.id,
      name: service.name,
      durationMin: service.duration,
      price: Number(service.price),
      category: service.category,
      isActive: service.is_active
    }));

    return new Response(
      JSON.stringify({
        tenantId,
        services: formattedServices
      }),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  leadIds: string[];
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client for auth verification
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is super_admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has super_admin role
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (rolesError || !roles) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: BroadcastRequest = await req.json();
    const { leadIds, message } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'leadIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch leads with their tenant info
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, whatsapp_number, name, tenant_id, tenants(settings)')
      .in('id', leadIds);

    if (leadsError) {
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No leads found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Evolution API credentials
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process leads in batches
    const batchSize = 50;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    const sentNumbers = new Set<string>();

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      for (const lead of batch) {
        // Skip duplicates
        if (sentNumbers.has(lead.whatsapp_number)) {
          continue;
        }
        sentNumbers.add(lead.whatsapp_number);

        try {
          // Replace placeholders in message
          let personalizedMessage = message;
          const firstName = lead.name ? lead.name.split(' ')[0] : 'cliente';
          personalizedMessage = personalizedMessage.replace(/\{\{nome\}\}/g, lead.name || 'cliente');
          personalizedMessage = personalizedMessage.replace(/\{\{primeiro_nome\}\}/g, firstName);

          // Get instance name from tenant settings or use default
          const tenantData = lead.tenants as { settings?: { whatsapp_instance?: string } } | null;
          const instanceName = tenantData?.settings?.whatsapp_instance || 'default';

          // Send message via Evolution API
          const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey,
            },
            body: JSON.stringify({
              number: lead.whatsapp_number,
              text: personalizedMessage,
            }),
          });

          if (response.ok) {
            const responseData = await response.json();
            
            // Record message in lead_messages
            await supabaseAdmin.from('lead_messages').insert({
              lead_id: lead.id,
              direction: 'outbound',
              content: personalizedMessage,
              external_message_id: responseData?.key?.id || null,
            });

            // Update lead last_message_at
            await supabaseAdmin
              .from('leads')
              .update({ last_message_at: new Date().toISOString() })
              .eq('id', lead.id);

            sent++;
          } else {
            const errorText = await response.text();
            errors.push(`${lead.whatsapp_number}: ${errorText}`);
            failed++;
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${lead.whatsapp_number}: ${errorMessage}`);
          failed++;
        }

        // Small delay between messages to avoid rate limiting
        await delay(100);
      }

      // Longer delay between batches
      if (i + batchSize < leads.length) {
        await delay(1000);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: leads.length,
        errors: errors.slice(0, 10), // Return first 10 errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lead-broadcast:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

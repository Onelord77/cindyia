import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

interface EvolutionRequest {
  action: 'create-instance' | 'get-qrcode' | 'connect' | 'disconnect' | 'delete-instance' | 'get-status' | 'fetch-instances'
  instanceName?: string
  webhookUrl?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Evolution API credentials from secrets
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')

    if (!evolutionApiKey || !evolutionApiUrl) {
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body: EvolutionRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { action, webhookUrl } = body;
    // Ensure instanceName is trimmed and validated
    const instanceName = body.instanceName?.trim() || '';

    console.log('Evolution API request:', { action, instanceName: instanceName || '(empty)', hasWebhook: !!webhookUrl });

    // Validate action
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Base URL cleanup (remove trailing slash if present)
    const baseUrl = evolutionApiUrl.replace(/\/$/, '')

    // Common headers for Evolution API
    const evolutionHeaders = {
      'apikey': evolutionApiKey,
      'Content-Type': 'application/json',
    }

    let response: Response
    let result: unknown

    switch (action) {
      case 'fetch-instances': {
        response = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: evolutionHeaders,
        })
        const instances = await response.json()
        
        // Fetch connection state for each instance to get accurate status
        if (Array.isArray(instances)) {
          const instancesWithStatus = await Promise.all(
            instances.map(async (inst: Record<string, unknown>) => {
              const instData = (inst.instance || inst) as Record<string, unknown>;
              const instName = instData.instanceName || instData.name || '';
              
              if (instName) {
                try {
                  const statusResponse = await fetch(`${baseUrl}/instance/connectionState/${instName}`, {
                    method: 'GET',
                    headers: evolutionHeaders,
                  });
                  const statusData = await statusResponse.json();
                  // Merge status into instance data
                  return {
                    ...inst,
                    instance: {
                      ...instData,
                      state: statusData?.state || statusData?.instance?.state || 'close',
                    },
                  };
                } catch {
                  return inst;
                }
              }
              return inst;
            })
          );
          result = instancesWithStatus;
        } else {
          result = instances;
        }
        break
      }

      case 'create-instance': {
        if (!instanceName) {
          console.error('create-instance: instanceName is empty');
          return new Response(
            JSON.stringify({ error: 'Instance name is required', code: 'INSTANCE_NAME_REQUIRED' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const createBody: Record<string, unknown> = {
          instanceName,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          rejectCall: false,
          groupsIgnore: false,
          alwaysOnline: false,
          readMessages: false,
          readStatus: false,
          syncFullHistory: false,
        }

        // Add webhook if provided
        if (webhookUrl) {
          createBody.webhook = {
            url: webhookUrl,
            byEvents: true,
            base64: false,
            headers: {},
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'MESSAGES_UPSERT',
              'SEND_MESSAGE',
            ],
          }
        }

        response = await fetch(`${baseUrl}/instance/create`, {
          method: 'POST',
          headers: evolutionHeaders,
          body: JSON.stringify(createBody),
        })
        result = await response.json()
        break
      }

      case 'get-qrcode': {
        if (!instanceName) {
          console.error('get-qrcode: instanceName is empty');
          return new Response(
            JSON.stringify({ error: 'Instance name is required', code: 'INSTANCE_NAME_REQUIRED' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('get-qrcode: Fetching QR for instance:', instanceName);
        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: evolutionHeaders,
        })
        result = await response.json()
        console.log('get-qrcode: Response status:', response.status, 'hasQR:', !!(result as Record<string, unknown>)?.base64);
        break
      }

      case 'get-status': {
        if (!instanceName) {
          console.error('get-status: instanceName is empty');
          return new Response(
            JSON.stringify({ error: 'Instance name is required', code: 'INSTANCE_NAME_REQUIRED' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: evolutionHeaders,
        })
        result = await response.json()
        break
      }

      case 'connect': {
        if (!instanceName) {
          console.error('connect: instanceName is empty');
          return new Response(
            JSON.stringify({ error: 'Instance name is required', code: 'INSTANCE_NAME_REQUIRED' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('connect: Connecting instance:', instanceName);
        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: evolutionHeaders,
        })
        result = await response.json()
        console.log('connect: Response status:', response.status, 'hasQR:', !!(result as Record<string, unknown>)?.base64);
        break
      }

      case 'disconnect': {
        if (!instanceName) {
          console.error('disconnect: instanceName is empty');
          return new Response(
            JSON.stringify({ error: 'Instance name is required', code: 'INSTANCE_NAME_REQUIRED' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        response = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: evolutionHeaders,
        })
        result = await response.json()
        break
      }

      case 'delete-instance': {
        if (!instanceName) {
          console.error('delete-instance: instanceName is empty');
          return new Response(
            JSON.stringify({ error: 'Instance name is required', code: 'INSTANCE_NAME_REQUIRED' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        response = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: evolutionHeaders,
        })
        result = await response.json()
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: response.ok, data: result }),
      { 
        status: response.ok ? 200 : response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Evolution API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const body: EvolutionRequest = await req.json()
    const { action, instanceName, webhookUrl } = body

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
        result = await response.json()
        break
      }

      case 'create-instance': {
        if (!instanceName) {
          return new Response(
            JSON.stringify({ error: 'Instance name is required' }),
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
          return new Response(
            JSON.stringify({ error: 'Instance name is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: evolutionHeaders,
        })
        result = await response.json()
        break
      }

      case 'get-status': {
        if (!instanceName) {
          return new Response(
            JSON.stringify({ error: 'Instance name is required' }),
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
          return new Response(
            JSON.stringify({ error: 'Instance name is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: evolutionHeaders,
        })
        result = await response.json()
        break
      }

      case 'disconnect': {
        if (!instanceName) {
          return new Response(
            JSON.stringify({ error: 'Instance name is required' }),
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
          return new Response(
            JSON.stringify({ error: 'Instance name is required' }),
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

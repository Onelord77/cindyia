import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Domínios permitidos para CORS
const ALLOWED_ORIGINS = [
  'https://app.cindyia.com',
  'https://cindyia.com',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  Deno.env.get('ALLOWED_ORIGIN'),
].filter(Boolean) as string[];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}

interface WhatsAppRequest {
  action: 'create-instance' | 'connect' | 'disconnect' | 'delete-instance' | 'get-status' | 'fetch-instances' | 'set-webhook' | 'set-webhook-all';
  instanceName?: string;
  tenantId?: string;
}

const UAZAPI_URL = Deno.env.get('UAZAPI_URL');
const UAZAPI_ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN');

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar configuração de ambiente
    if (!UAZAPI_URL || !UAZAPI_ADMIN_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Configuração de WhatsApp não disponível' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify calling user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for DB operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile for tenant_id
    const { data: profile } = await adminClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    // Check roles
    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    const isAdmin = roles?.some(r => r.role === 'admin');

    if (!isSuperAdmin && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: WhatsAppRequest = await req.json();
    const { action, instanceName, tenantId: requestTenantId } = body;

    // Determine tenant_id
    const tenantId = isSuperAdmin ? (requestTenantId || profile?.tenant_id) : profile?.tenant_id;

    if (!tenantId && action !== 'fetch-instances' && action !== 'set-webhook-all') {
      return new Response(
        JSON.stringify({ error: 'Tenant não identificado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'create-instance': {
        if (!instanceName?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const name = instanceName.trim();

        // Check if instance already exists for this tenant
        const { data: existing } = await adminClient
          .from('whatsapp_instances')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('instance_name', name)
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Já existe uma instância com este nome' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create instance on UaZapi
        const createRes = await fetch(`${UAZAPI_URL}/instance/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'admintoken': UAZAPI_ADMIN_TOKEN,
          },
          body: JSON.stringify({
            name: name,
            systemName: 'cindyia',
          }),
        });

        if (!createRes.ok) {
          const errorText = await createRes.text();
          console.error('UaZapi create error:', errorText);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar instância no WhatsApp' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const createData = await createRes.json();
        const instanceToken = createData.token;
        const instanceId = createData.instance?.id;

        if (!instanceToken) {
          return new Response(
            JSON.stringify({ error: 'Token não retornado pela API' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Store in database
        const { data: dbInstance, error: dbError } = await adminClient
          .from('whatsapp_instances')
          .insert({
            tenant_id: tenantId,
            instance_name: name,
            instance_id: instanceId || null,
            instance_token: instanceToken,
            status: 'disconnected',
          })
          .select()
          .single();

        if (dbError) {
          console.error('DB insert error:', dbError);
          return new Response(
            JSON.stringify({ error: 'Erro ao salvar instância' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            instance: {
              id: dbInstance.id,
              instanceName: name,
              instanceId: instanceId,
              status: 'disconnected',
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'connect': {
        if (!instanceName?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get instance token from DB
        const { data: instance } = await adminClient
          .from('whatsapp_instances')
          .select('instance_token')
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim())
          .single();

        if (!instance) {
          return new Response(
            JSON.stringify({ error: 'Instância não encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Call UaZapi connect (without phone = QR code)
        const connectRes = await fetch(`${UAZAPI_URL}/instance/connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'token': instance.instance_token,
          },
          body: JSON.stringify({}),
        });

        if (!connectRes.ok) {
          const errorText = await connectRes.text();
          console.error('UaZapi connect error:', errorText);
          return new Response(
            JSON.stringify({ error: 'Erro ao conectar instância' }),
            { status: connectRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connectData = await connectRes.json();

        // Update status in DB
        await adminClient
          .from('whatsapp_instances')
          .update({ status: 'connecting' })
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim());

        return new Response(
          JSON.stringify({
            success: true,
            qrcode: connectData.instance?.qrcode || null,
            paircode: connectData.instance?.paircode || null,
            status: connectData.instance?.status || 'connecting',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-status': {
        if (!instanceName?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get instance token from DB
        const { data: instance } = await adminClient
          .from('whatsapp_instances')
          .select('instance_token')
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim())
          .single();

        if (!instance) {
          return new Response(
            JSON.stringify({ error: 'Instância não encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get status from UaZapi
        const statusRes = await fetch(`${UAZAPI_URL}/instance/status`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'token': instance.instance_token,
          },
        });

        if (!statusRes.ok) {
          return new Response(
            JSON.stringify({ error: 'Erro ao obter status', notFound: statusRes.status === 404 }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const statusData = await statusRes.json();
        const currentStatus = statusData.instance?.status || 'disconnected';

        // Update status in DB
        await adminClient
          .from('whatsapp_instances')
          .update({
            status: currentStatus,
            profile_name: statusData.instance?.profileName || null,
            profile_pic_url: statusData.instance?.profilePicUrl || null,
          })
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim());

        return new Response(
          JSON.stringify({
            instance: {
              state: currentStatus,
              profileName: statusData.instance?.profileName || null,
              profilePicUrl: statusData.instance?.profilePicUrl || null,
            },
            qrcode: statusData.instance?.qrcode || null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disconnect': {
        if (!instanceName?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get instance token from DB
        const { data: instance } = await adminClient
          .from('whatsapp_instances')
          .select('instance_token')
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim())
          .single();

        if (!instance) {
          return new Response(
            JSON.stringify({ error: 'Instância não encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Disconnect on UaZapi
        const disconnectRes = await fetch(`${UAZAPI_URL}/instance/disconnect`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'token': instance.instance_token,
          },
        });

        if (!disconnectRes.ok && disconnectRes.status !== 404) {
          return new Response(
            JSON.stringify({ error: 'Erro ao desconectar instância' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update status in DB
        await adminClient
          .from('whatsapp_instances')
          .update({ status: 'disconnected' })
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim());

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-instance': {
        if (!instanceName?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get instance token from DB
        const { data: instance } = await adminClient
          .from('whatsapp_instances')
          .select('instance_token')
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim())
          .single();

        if (instance) {
          // Delete on UaZapi
          await fetch(`${UAZAPI_URL}/instance`, {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'token': instance.instance_token,
            },
          });
        }

        // Remove from DB
        await adminClient
          .from('whatsapp_instances')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim());

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fetch-instances': {
        // Fetch instances from DB for the tenant
        const query = adminClient
          .from('whatsapp_instances')
          .select('*');

        if (!isSuperAdmin) {
          query.eq('tenant_id', tenantId);
        } else if (tenantId) {
          query.eq('tenant_id', tenantId);
        }

        const { data: instances, error: fetchError } = await query;

        if (fetchError) {
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar instâncias' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Map to frontend format
        const mappedInstances = (instances || []).map(inst => ({
          instanceName: inst.instance_name,
          instanceId: inst.instance_id,
          status: inst.status || 'disconnected',
          profileName: inst.profile_name,
          profilePictureUrl: inst.profile_pic_url,
        }));

        return new Response(
          JSON.stringify(mappedInstances),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set-webhook': {
        if (!instanceName?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Nome da instância é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get instance token from DB
        const { data: instance } = await adminClient
          .from('whatsapp_instances')
          .select('instance_token')
          .eq('tenant_id', tenantId)
          .eq('instance_name', instanceName.trim())
          .single();

        if (!instance) {
          return new Response(
            JSON.stringify({ error: 'Instância não encontrada' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get webhook URL from system_settings
        const { data: setting } = await adminClient
          .from('system_settings')
          .select('value')
          .eq('key', 'whatsapp_webhook_url')
          .single();

        const webhookUrl = setting?.value?.trim();

        if (!webhookUrl) {
          // No webhook configured, skip silently
          return new Response(
            JSON.stringify({ success: true, skipped: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Configure webhook on UaZapi (simple mode)
        const webhookRes = await fetch(`${UAZAPI_URL}/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'token': instance.instance_token,
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ['messages', 'connection'],
            excludeMessages: ['wasSentByApi', 'isGroupYes'],
          }),
        });

        if (!webhookRes.ok) {
          const errorText = await webhookRes.text();
          console.error('UaZapi webhook error:', errorText);
          return new Response(
            JSON.stringify({ error: 'Erro ao configurar webhook' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const webhookData = await webhookRes.json();

        return new Response(
          JSON.stringify({ success: true, webhook: webhookData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set-webhook-all': {
        if (!isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Apenas super admin pode executar esta ação' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get webhook URL from system_settings
        const { data: setting } = await adminClient
          .from('system_settings')
          .select('value')
          .eq('key', 'whatsapp_webhook_url')
          .single();

        const webhookUrl = setting?.value?.trim();

        if (!webhookUrl) {
          return new Response(
            JSON.stringify({ success: true, skipped: true, message: 'Nenhuma URL configurada' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all connected instances
        const { data: connectedInstances } = await adminClient
          .from('whatsapp_instances')
          .select('instance_name, instance_token')
          .eq('status', 'connected');

        if (!connectedInstances || connectedInstances.length === 0) {
          return new Response(
            JSON.stringify({ success: true, configured: 0, message: 'Nenhuma instância conectada' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Configure webhook on each connected instance
        let configured = 0;
        const errors: string[] = [];

        for (const inst of connectedInstances) {
          try {
            const res = await fetch(`${UAZAPI_URL}/webhook`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': inst.instance_token,
              },
              body: JSON.stringify({
                enabled: true,
                url: webhookUrl,
                events: ['messages', 'connection'],
                excludeMessages: ['wasSentByApi', 'isGroupYes'],
              }),
            });

            if (res.ok) {
              configured++;
            } else {
              errors.push(`${inst.instance_name}: ${res.status}`);
            }
          } catch (e) {
            errors.push(`${inst.instance_name}: ${e.message}`);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            configured,
            total: connectedInstances.length,
            errors: errors.length > 0 ? errors : undefined,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

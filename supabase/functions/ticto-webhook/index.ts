import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specials = '@#$!';
  let pwd = '';
  for (let i = 0; i < 8; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  pwd += specials[Math.floor(Math.random() * specials.length)];
  pwd += Math.floor(Math.random() * 10);
  // Embaralha
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function sendWhatsApp(
  uazapiUrl: string,
  instanceToken: string,
  phone: string,
  message: string
): Promise<void> {
  const normalized = normalizePhone(phone);
  const res = await fetch(`${uazapiUrl}/send/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': instanceToken,
    },
    body: JSON.stringify({
      number: normalized,
      text: message,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('UaZapi send error:', text);
    throw new Error(`Falha ao enviar WhatsApp: ${res.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const tictoToken = Deno.env.get('TICTO_WEBHOOK_TOKEN');
  const uazapiUrl = Deno.env.get('UAZAPI_URL');
  const uazapiInstanceToken = Deno.env.get('UAZAPI_NOTIFICATION_TOKEN');

  try {
    const body = await req.json();

    // Valida token de segurança da Ticto (campo token no payload)
    if (tictoToken) {
      const receivedToken =
        body.token ||
        body.webhook_token ||
        req.headers.get('x-ticto-token');
      if (receivedToken !== tictoToken) {
        console.warn('Token Ticto inválido:', receivedToken);
        return new Response(JSON.stringify({ error: 'Token inválido' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Só processa venda aprovada/paga
    const status: string = (body.status || body.transaction_status || '').toLowerCase();
    const validStatuses = ['approved', 'paid', 'complete', 'completed', 'aprovado', 'pago'];
    if (!validStatuses.includes(status)) {
      console.log('Evento ignorado, status:', status);
      return new Response(JSON.stringify({ ok: true, ignored: true, status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrai dados do cliente (suporta v1 e v2 da Ticto)
    const customer = body.customer || body.buyer || body.client || {};
    const fullName: string =
      customer.name ||
      customer.full_name ||
      body.customer_name ||
      'Cliente';
    const email: string =
      customer.email || body.customer_email || '';
    const phone: string =
      customer.phone || customer.cellphone || body.customer_phone || '';
    const productName: string =
      body.product?.name || body.product_name || body.offer?.name || 'CindyIA';

    if (!email && !phone) {
      console.error('Payload sem email nem telefone:', JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: 'Dados do cliente insuficientes' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Evita duplicata: verifica se o email já tem usuário
    if (email) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const alreadyExists = existingUsers?.users?.some(u => u.email === email);
      if (alreadyExists) {
        console.log('Usuário já existe:', email);
        return new Response(JSON.stringify({ ok: true, skipped: 'already_exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Cria tenant para o novo cliente
    const tenantName = `${fullName} - ${productName}`;
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: tenantName,
        email: email || null,
        phone: phone || null,
        status: 'active',
        onboarding_completed: false,
        max_employees: 10,
        max_whatsapp_instances: 1,
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      console.error('Erro ao criar tenant:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar empresa' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gera senha aleatória
    const password = generatePassword();

    // Define email (fallback para formato interno se não tiver)
    const userEmail = email || `${normalizePhone(phone)}.${Date.now()}@interno.local`;

    // Cria usuário no Supabase Auth
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !newUser?.user) {
      console.error('Erro ao criar usuário:', createError);
      // Rollback tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;

    // Atualiza profile com tenant e dados, marcando que deve trocar senha
    await adminClient
      .from('profiles')
      .update({
        tenant_id: tenant.id,
        full_name: fullName,
        phone: phone || null,
        email: userEmail,
        must_change_password: true,
      })
      .eq('id', userId);

    // Cria role admin para o usuário
    await adminClient.from('user_roles').insert({
      user_id: userId,
      role: 'admin',
      tenant_id: tenant.id,
    });

    // Cria registro de employee
    await adminClient.from('employees').insert({
      tenant_id: tenant.id,
      user_id: userId,
      name: fullName,
      email: userEmail,
      phone: phone || null,
      role: 'admin',
      is_active: true,
    });

    console.log(`Usuário criado: ${userEmail} | tenant: ${tenant.id}`);

    // Envia credenciais via WhatsApp
    if (uazapiUrl && uazapiInstanceToken && phone) {
      const message =
        `🎉 Bem-vindo(a) ao CindyIA, ${fullName.split(' ')[0]}!\n\n` +
        `Seus dados de acesso:\n` +
        `🔗 Acesso: https://app.cindyia.com\n` +
        `📧 Login: ${userEmail}\n` +
        `🔑 Senha: ${password}\n\n` +
        `⚠️ Recomendamos que você troque sua senha no primeiro acesso.\n\n` +
        `Qualquer dúvida, estamos aqui! 😊`;

      try {
        await sendWhatsApp(uazapiUrl, uazapiInstanceToken, phone, message);
        console.log('WhatsApp enviado para:', phone);
      } catch (wErr) {
        // Não falha o processo se o WhatsApp der erro
        console.error('Erro ao enviar WhatsApp (não bloqueia):', wErr);
      }
    } else {
      console.log('WhatsApp não enviado: variáveis de ambiente ausentes ou telefone não fornecido');
    }

    return new Response(
      JSON.stringify({
        ok: true,
        userId,
        tenantId: tenant.id,
        email: userEmail,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro inesperado:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

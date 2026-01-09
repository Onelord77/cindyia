import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  tenantId: string;
  role: 'admin' | 'manager' | 'user';
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify permissions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the calling user
    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check calling user's roles
    const { data: callerRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id);

    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin');
    const isAdmin = callerRoles?.some(r => r.role === 'admin');
    const isManager = callerRoles?.some(r => r.role === 'manager');

    // Get caller's tenant
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', callingUser.id)
      .single();

    const body: CreateUserRequest = await req.json();
    const { email, password, fullName, tenantId, role, phone } = body;

    // Validate required fields
    if (!email || !password || !fullName || !tenantId || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, password, fullName, tenantId, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Permission checks
    if (role === 'admin') {
      // Only super_admin can create admins
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Apenas super admins podem criar administradores' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (role === 'manager' || role === 'user') {
      // Admins and managers can create users, but only for their own tenant
      if (!isSuperAdmin && !isAdmin && !isManager) {
        return new Response(
          JSON.stringify({ error: 'Permissão negada' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Non-super admins can only create users in their own tenant
      if (!isSuperAdmin && callerProfile?.tenant_id !== tenantId) {
        return new Response(
          JSON.stringify({ error: 'Você só pode criar usuários na sua própria empresa' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check tenant exists and is active
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('id, name, max_employees, status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Empresa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tenant.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Empresa inativa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check employee limit for non-admin roles
    if (role !== 'admin') {
      const { count } = await adminClient
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (count !== null && count >= (tenant.max_employees || 10)) {
        return new Response(
          JSON.stringify({ error: `Limite de ${tenant.max_employees} funcionários atingido` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create the user in auth.users
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with tenant_id and additional info
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        tenant_id: tenantId,
        full_name: fullName,
        phone: phone || null,
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Rollback: delete user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar perfil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create role entry
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        tenant_id: tenantId,
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Rollback
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir função' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For non-admin roles, also create an employee record
    if (role !== 'admin') {
      const { error: employeeError } = await adminClient
        .from('employees')
        .insert({
          tenant_id: tenantId,
          user_id: newUser.user.id,
          name: fullName,
          email: email,
          phone: phone || null,
          role: role === 'manager' ? 'admin' : 'employee',
          is_active: true,
        });

      if (employeeError) {
        console.error('Error creating employee:', employeeError);
        // Rollback
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar funcionário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          fullName,
          tenantId,
          role,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

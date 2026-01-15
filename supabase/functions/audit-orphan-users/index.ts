import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrphanUser {
  id: string;
  email: string;
  created_at: string;
  has_profile: boolean;
  has_employee: boolean;
  has_role: boolean;
  tenant_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is super_admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super_admin can run this audit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all users from auth.users
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      throw usersError;
    }

    // Get all profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, tenant_id');

    // Get all employees with user_id
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('user_id');

    // Get all user_roles
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const employeeUserIds = new Set(employees?.filter(e => e.user_id).map(e => e.user_id) || []);
    const roleUserIds = new Set(userRoles?.map(r => r.user_id) || []);

    const orphanUsers: OrphanUser[] = [];

    for (const authUser of authUsers.users) {
      const profile = profileMap.get(authUser.id);
      const hasEmployee = employeeUserIds.has(authUser.id);
      const hasRole = roleUserIds.has(authUser.id);

      // A user is considered orphan if:
      // 1. No profile, OR
      // 2. No employee record linked, OR
      // 3. Has profile but no tenant_id (unless super_admin)
      const isSuperAdminUser = userRoles?.some(r => r.user_id === authUser.id && r.role === 'super_admin');
      
      const isOrphan = !profile || 
                       (!hasEmployee && !isSuperAdminUser) || 
                       (!profile?.tenant_id && !isSuperAdminUser);

      if (isOrphan) {
        orphanUsers.push({
          id: authUser.id,
          email: authUser.email || 'N/A',
          created_at: authUser.created_at,
          has_profile: !!profile,
          has_employee: hasEmployee,
          has_role: hasRole,
          tenant_id: profile?.tenant_id || null,
        });
      }
    }

    // Summary stats
    const summary = {
      total_auth_users: authUsers.users.length,
      total_profiles: profiles?.length || 0,
      total_employees_with_login: employeeUserIds.size,
      orphan_users_count: orphanUsers.length,
      audit_timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        orphan_users: orphanUsers,
        message: orphanUsers.length === 0 
          ? 'Nenhum usuário órfão encontrado. Sistema íntegro!' 
          : `Encontrados ${orphanUsers.length} usuários órfãos que precisam de atenção.`,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audit error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

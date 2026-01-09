import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check calling user's roles
    const { data: callerRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id);

    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin');
    const isAdmin = callerRoles?.some(r => r.role === 'admin');
    const isManager = callerRoles?.some(r => r.role === 'manager');

    if (!isSuperAdmin && !isAdmin && !isManager) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's tenant
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', callingUser.id)
      .single();

    const body: DeleteUserRequest = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's info
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    const { data: targetRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const targetIsSuperAdmin = targetRoles?.some(r => r.role === 'super_admin');
    const targetIsAdmin = targetRoles?.some(r => r.role === 'admin');

    // Cannot delete super admins
    if (targetIsSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Não é possível excluir super administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only super_admin can delete admins
    if (targetIsAdmin && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas super admins podem excluir administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Non-super admins can only delete users from their own tenant
    if (!isSuperAdmin && targetProfile?.tenant_id !== callerProfile?.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Você só pode excluir usuários da sua própria empresa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the user (cascade will handle profiles, roles, employees)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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

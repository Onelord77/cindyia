import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Verify caller is super_admin
    const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is super_admin
    const { data: callerRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id);

    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin');

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas super admins podem executar esta operação' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find orphan users: users with login but no employee link
    // Exclude super_admins
    const { data: allProfiles } = await adminClient
      .from('profiles')
      .select('id, full_name, email');

    if (!allProfiles || allProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum perfil encontrado', deleted: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orphanUsers: { id: string; email: string | null; full_name: string | null }[] = [];

    for (const profile of allProfiles) {
      // Check if user is super_admin - NEVER delete super_admins
      const { data: userRoles } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id);

      const isUserSuperAdmin = userRoles?.some(r => r.role === 'super_admin');
      
      if (isUserSuperAdmin) {
        console.log(`Skipping super_admin: ${profile.email}`);
        continue;
      }

      // Check if user has an employee record linked
      const { data: employeeLink } = await adminClient
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      // If no employee link exists, this is an orphan user
      if (!employeeLink) {
        orphanUsers.push({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name
        });
      }
    }

    console.log(`Found ${orphanUsers.length} orphan users to delete`);

    const deleted: { id: string; email: string | null }[] = [];
    const errors: { id: string; email: string | null; error: string }[] = [];

    for (const orphan of orphanUsers) {
      try {
        console.log(`Deleting orphan user: ${orphan.email} (${orphan.id})`);

        // Delete user_roles first
        await adminClient
          .from('user_roles')
          .delete()
          .eq('user_id', orphan.id);

        // Delete profile
        await adminClient
          .from('profiles')
          .delete()
          .eq('id', orphan.id);

        // Delete auth user
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(orphan.id);

        if (deleteError) {
          console.error(`Error deleting auth user ${orphan.email}:`, deleteError);
          errors.push({ id: orphan.id, email: orphan.email, error: deleteError.message });
        } else {
          deleted.push({ id: orphan.id, email: orphan.email });
          console.log(`Successfully deleted: ${orphan.email}`);
        }
      } catch (err) {
        console.error(`Unexpected error deleting ${orphan.email}:`, err);
        errors.push({ id: orphan.id, email: orphan.email, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Limpeza concluída. ${deleted.length} usuários órfãos removidos.`,
        deleted,
        errors: errors.length > 0 ? errors : undefined,
        total_found: orphanUsers.length
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

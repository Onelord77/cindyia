import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface OnboardingStatus {
  isOnboardingComplete: boolean | null;
  isLoading: boolean;
  tenantId: string | null;
  refetch: () => void;
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user, isSuperAdmin } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    // Super admins don't have onboarding
    if (isSuperAdmin) {
      setIsOnboardingComplete(true);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        setIsOnboardingComplete(false);
        setIsLoading(false);
        return;
      }

      setTenantId(profile.tenant_id);

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('onboarding_completed')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantError) {
        setIsOnboardingComplete(false);
        setIsLoading(false);
        return;
      }

      setIsOnboardingComplete(tenant.onboarding_completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingComplete(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isSuperAdmin]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    isOnboardingComplete,
    isLoading,
    tenantId,
    refetch: fetchStatus,
  };
}

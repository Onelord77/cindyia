import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BrandingConfig {
  displayName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  loginBackgroundUrl: string | null;
}

const BRANDING_CACHE_KEY = 'cindyia_branding_cache';

export const defaultBranding: BrandingConfig = {
  displayName: null,
  tagline: null,
  logoUrl: null,
  faviconUrl: null,
  primaryColor: null,
  secondaryColor: null,
  loginBackgroundUrl: null,
};

/** Tipos de arquivo aceitos para upload de imagens de branding */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

function loadCachedBranding(): BrandingConfig | null {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrandingConfig;
  } catch {
    return null;
  }
}

function saveCachedBranding(branding: BrandingConfig) {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch {
    // localStorage pode estar cheio ou indisponível — silencia
  }
}

export function useBranding() {
  const { user } = useAuth();

  // Inicializa com cache do localStorage para que a tela de login
  // já mostre o branding mesmo antes de carregar do Supabase.
  const [branding, setBranding] = useState<BrandingConfig>(
    () => loadCachedBranding() ?? defaultBranding
  );
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const fetchBranding = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) return;

      setTenantId(profile.tenant_id);

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantError || !tenant) return;

      const settings = (tenant.settings as Record<string, unknown>) || {};
      const raw = (settings.branding as Partial<BrandingConfig>) || {};

      const loaded: BrandingConfig = {
        displayName: raw.displayName ?? null,
        tagline: raw.tagline ?? null,
        logoUrl: raw.logoUrl ?? null,
        faviconUrl: raw.faviconUrl ?? null,
        primaryColor: raw.primaryColor ?? null,
        secondaryColor: raw.secondaryColor ?? null,
        loginBackgroundUrl: raw.loginBackgroundUrl ?? null,
      };

      setBranding(loaded);
      saveCachedBranding(loaded);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Salva o branding no banco fazendo MERGE com as settings existentes.
   * Isso evita sobrescrever outras chaves do JSONB (openTime, aiKnowledgeBase, etc.).
   */
  const updateBranding = useCallback(async (newBranding: BrandingConfig): Promise<boolean> => {
    if (!tenantId) {
      toast.error('Tenant não encontrado');
      return false;
    }

    try {
      // Lê as settings atuais antes de salvar para não sobrescrever outras chaves
      const { data: tenant, error: readError } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();

      if (readError) {
        toast.error('Erro ao salvar identidade visual');
        return false;
      }

      const currentSettings = (tenant?.settings as Record<string, unknown>) || {};
      // Merge: preserva todas as outras chaves (openTime, aiKnowledgeBase, etc.)
      const mergedSettings = { ...currentSettings, branding: newBranding };

      const { error } = await supabase
        .from('tenants')
        .update({ settings: mergedSettings, updated_at: new Date().toISOString() })
        .eq('id', tenantId);

      if (error) {
        toast.error('Erro ao salvar identidade visual');
        return false;
      }

      setBranding(newBranding);
      saveCachedBranding(newBranding);
      toast.success('Identidade visual salva com sucesso!');
      return true;
    } catch {
      toast.error('Erro ao salvar identidade visual');
      return false;
    }
  }, [tenantId]);

  /**
   * Faz upload de uma imagem para o bucket `branding/{tenantId}/`.
   * Valida tamanho (máx 2MB) e tipo (PNG, JPEG, WebP, SVG) antes de enviar.
   * Retorna a URL pública com cache-buster, ou null em caso de erro.
   */
  const uploadImage = useCallback(async (
    file: File,
    type: 'logo' | 'favicon' | 'login-background'
  ): Promise<string | null> => {
    if (!tenantId) {
      toast.error('Tenant não encontrado');
      return null;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`Arquivo muito grande. Máximo permitido: 2MB (atual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return null;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não aceito. Use PNG, JPEG, WebP ou SVG');
      return null;
    }

    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${tenantId}/${type}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error('Erro ao fazer upload da imagem');
      return null;
    }

    const { data } = supabase.storage.from('branding').getPublicUrl(path);
    // Cache-buster para forçar o browser a recarregar a imagem após substituição
    return `${data.publicUrl}?t=${Date.now()}`;
  }, [tenantId]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return {
    branding,
    isLoading,
    tenantId,
    updateBranding,
    uploadImage,
    refetch: fetchBranding,
  };
}

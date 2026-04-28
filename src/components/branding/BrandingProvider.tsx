import { createContext, useContext, useEffect } from 'react';
import { useBranding, BrandingConfig, defaultBranding } from '@/hooks/useBranding';

interface BrandingContextValue {
  branding: BrandingConfig;
  isLoading: boolean;
  tenantId: string | null;
  updateBranding: (b: BrandingConfig) => Promise<boolean>;
  uploadImage: (file: File, type: 'logo' | 'favicon' | 'login-background') => Promise<string | null>;
  refetch: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: defaultBranding,
  isLoading: false,
  tenantId: null,
  updateBranding: async () => false,
  uploadImage: async () => null,
  refetch: async () => {},
});

function lightenHsl(hslValues: string, amount: number): string {
  const parts = hslValues.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hslValues;
  const l = Math.min(95, parseInt(parts[3]) + amount);
  return `${parts[1]} ${parts[2]}% ${l}%`;
}

function hexToHslValues(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const brandingState = useBranding();
  const { branding } = brandingState;

  // Injeta um <style> no final do <head> com as CSS vars do branding em :root E .dark.
  // Usar um <style> (ao invés de element.style.setProperty) garante que as regras
  // sobrescrevam os seletores .dark{} do index.css por ordem de cascata, sem depender
  // de especificidade de inline style — e funciona igual em tema claro e escuro.
  useEffect(() => {
    const STYLE_ID = 'branding-css-overrides';
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }

    const primaryHsl = branding.primaryColor ? hexToHslValues(branding.primaryColor) : null;
    const secondaryHsl = branding.secondaryColor ? hexToHslValues(branding.secondaryColor) : null;

    if (!primaryHsl && !secondaryHsl) {
      styleEl.textContent = '';
      return;
    }

    const lines: string[] = [];
    if (primaryHsl) {
      lines.push(`  --primary: ${primaryHsl};`);
      lines.push(`  --primary-foreground: 0 0% 100%;`);
      lines.push(`  --sidebar-primary: ${primaryHsl};`);
      lines.push(`  --ring: ${primaryHsl};`);
      lines.push(`  --brand-primary: ${primaryHsl};`);
      lines.push(`  --accent: ${lightenHsl(primaryHsl, 35)};`);
      lines.push(`  --accent-foreground: ${primaryHsl};`);
    }
    if (secondaryHsl) {
      lines.push(`  --sidebar-background: ${secondaryHsl};`);
      lines.push(`  --sidebar-accent: ${lightenHsl(secondaryHsl, 6)};`);
      lines.push(`  --sidebar-foreground: 0 0% 90%;`);
      lines.push(`  --sidebar-accent-foreground: 0 0% 95%;`);
      lines.push(`  --brand-secondary: ${secondaryHsl};`);
    }

    const block = lines.join('\n');
    styleEl.textContent = `:root {\n${block}\n}\n.dark {\n${block}\n}`;
  }, [branding.primaryColor, branding.secondaryColor]);

  // Atualiza o <title> da aba do navegador
  useEffect(() => {
    document.title = branding.displayName
      ? `${branding.displayName} - Sistema de Agendamentos`
      : 'Cindy IA - Sistema de Agendamentos';
  }, [branding.displayName]);

  // Atualiza o favicon dinamicamente
  useEffect(() => {
    const faviconUrl = branding.faviconUrl || '/assets/images/logo.png';
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [branding.faviconUrl]);

  return (
    <BrandingContext.Provider value={brandingState}>
      {children}
    </BrandingContext.Provider>
  );
}

/** Hook para consumir o contexto de branding em qualquer componente */
export function useBrandingContext() {
  return useContext(BrandingContext);
}
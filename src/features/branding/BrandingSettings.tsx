import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, Loader2, Upload, X, Image, Palette } from 'lucide-react';
import { useBrandingContext } from '@/components/branding/BrandingProvider';
import { BrandingConfig, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/hooks/useBranding';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

interface UploadFieldProps {
  label: string;
  description: string;
  currentUrl: string | null;
  previewUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  uploading: boolean;
}

function UploadField({
  label,
  description,
  currentUrl,
  previewUrl,
  onFileSelect,
  onClear,
  uploading,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl || currentUrl;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação client-side antes do upload
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`Arquivo muito grande. Máximo: 2MB (atual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      e.target.value = '';
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Tipo inválido. Use PNG, JPEG, WebP ou SVG');
      e.target.value = '';
      return;
    }

    onFileSelect(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-3">
        {displayUrl ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt={label}
              className="h-16 w-16 rounded-lg object-contain border bg-muted/30"
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
            <Image className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {displayUrl ? 'Substituir' : 'Enviar imagem'}
          </Button>
          <span className="text-xs text-muted-foreground">PNG, JPEG, WebP ou SVG · máx. 2MB</span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES_ATTR}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorField({ label, description, value, onChange }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const [tempColor, setTempColor] = useState(value);

  const handleOpen = () => {
    setTempColor(value);
    setOpen(true);
  };

  const handleConfirm = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(tempColor)) {
      onChange(tempColor);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleOpen}
          className="h-10 w-10 rounded-md border border-input cursor-pointer"
          style={{ backgroundColor: value }}
          aria-label={`Escolher ${label}`}
        />
        <span className="font-mono text-sm text-muted-foreground">{value}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
          Escolher cor
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Escolher {label}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <input
              type="color"
              value={tempColor}
              onChange={(e) => setTempColor(e.target.value)}
              className="h-24 w-24 cursor-pointer rounded-lg border border-input bg-transparent p-1"
            />
            <div className="flex items-center gap-2 w-full">
              <Label className="shrink-0">Hex</Label>
              <Input
                value={tempColor}
                onChange={(e) => setTempColor(e.target.value)}
                placeholder="#000000"
                className="font-mono text-sm"
                maxLength={7}
              />
              <div
                className="h-9 w-9 shrink-0 rounded-md border"
                style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(tempColor) ? tempColor : 'transparent' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!/^#[0-9a-fA-F]{6}$/.test(tempColor)}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Preview ao vivo ----------

interface LivePreviewProps {
  form: BrandingConfig;
  logoPreview: string | null;
}

function LivePreview({ form, logoPreview }: LivePreviewProps) {
  const displayName = form.displayName || 'Cindy IA';
  const tagline = form.tagline || 'Sistema de Agendamentos';
  const logoSrc = logoPreview || form.logoUrl || '/assets/images/logo.png';
  const primary = form.primaryColor || '#8B5CF6';
  const secondary = form.secondaryColor || '#1e293b';

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Preview ao vivo</p>

      {/* Mini Sidebar */}
      <div
        className="rounded-lg border overflow-hidden w-[200px]"
        style={{ backgroundColor: secondary }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
          <img
            src={logoSrc}
            alt="logo preview"
            className="h-8 w-8 rounded-md object-contain bg-white/10"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/images/logo.png'; }}
          />
          <span className="text-sm font-bold text-white truncate">{displayName}</span>
        </div>

        {/* Fake menu items */}
        {['Dashboard', 'Agenda', 'Clientes'].map((item, i) => (
          <div
            key={item}
            className={cn(
              'flex items-center gap-2 px-3 py-2 mx-2 my-1 rounded-md text-xs',
              i === 0
                ? 'text-white font-medium'
                : 'text-white/50'
            )}
            style={i === 0 ? { backgroundColor: primary } : {}}
          >
            <div className="h-3 w-3 rounded bg-current opacity-60" />
            {item}
          </div>
        ))}
        <div className="pb-2" />
      </div>

      {/* Mini Login Card */}
      <div className="rounded-lg border bg-background p-4 w-[200px] text-center space-y-2">
        <img
          src={logoSrc}
          alt="logo preview"
          className="h-10 w-10 rounded-full object-contain mx-auto"
          style={{ border: `2px solid ${primary}` }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/images/logo.png'; }}
        />
        <p className="text-xs font-bold">{displayName}</p>
        <p className="text-[10px] text-muted-foreground">{tagline}</p>
        <div
          className="rounded px-3 py-1 text-[10px] text-white font-medium"
          style={{ backgroundColor: primary }}
        >
          Entrar
        </div>
      </div>

      {/* Palette */}
      <div className="flex gap-2">
        <div className="text-center">
          <div className="h-8 w-8 rounded-md border" style={{ backgroundColor: primary }} />
          <p className="text-[10px] text-muted-foreground mt-1">Primária</p>
        </div>
        <div className="text-center">
          <div className="h-8 w-8 rounded-md border" style={{ backgroundColor: secondary }} />
          <p className="text-[10px] text-muted-foreground mt-1">Secundária</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Componente principal ----------

export function BrandingSettings() {
  const { branding, updateBranding, uploadImage } = useBrandingContext();

  const [form, setForm] = useState<BrandingConfig>({ ...branding });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [saving, setSaving] = useState(false);

  // Atualiza estado local se o branding do contexto mudar (ex: após refetch)
  // Usamos uma ref para evitar loop — só atualiza se o branding mudar externamente
  const updateField = <K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoSelect = async (file: File) => {
    // Preview local imediato
    setLogoPreview(URL.createObjectURL(file));

    setUploadingLogo(true);
    const url = await uploadImage(file, 'logo');
    setUploadingLogo(false);

    if (url) {
      updateField('logoUrl', url);
      // Mantém o preview local até salvar
    } else {
      setLogoPreview(null);
    }
  };

  const handleFaviconSelect = async (file: File) => {
    setFaviconPreview(URL.createObjectURL(file));

    setUploadingFavicon(true);
    const url = await uploadImage(file, 'favicon');
    setUploadingFavicon(false);

    if (url) {
      updateField('faviconUrl', url);
    } else {
      setFaviconPreview(null);
    }
  };

  const handleBgSelect = async (file: File) => {
    setBgPreview(URL.createObjectURL(file));

    setUploadingBg(true);
    const url = await uploadImage(file, 'login-background');
    setUploadingBg(false);

    if (url) {
      updateField('loginBackgroundUrl', url);
    } else {
      setBgPreview(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateBranding(form);
    setSaving(false);
    // Limpa previews locais após salvar — agora usamos as URLs do storage
    setLogoPreview(null);
    setFaviconPreview(null);
    setBgPreview(null);
  };

  const isSaving = saving || uploadingLogo || uploadingFavicon || uploadingBg;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Identidade Visual
          </CardTitle>
          <CardDescription>
            Personalize o visual do painel para seus clientes. Deixe em branco para usar o padrão CindyIA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Nome e Tagline */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de Exibição</Label>
              <Input
                id="displayName"
                placeholder="Ex: Jeniffer Venâncio"
                value={form.displayName ?? ''}
                onChange={(e) => updateField('displayName', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Aparece na sidebar e na aba do navegador
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                placeholder="Ex: Estética & Bem-Estar"
                value={form.tagline ?? ''}
                onChange={(e) => updateField('tagline', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Subtítulo exibido na tela de login
              </p>
            </div>
          </div>

          <Separator />

          {/* Uploads de imagem */}
          <div className="space-y-5">
            <UploadField
              label="Logo"
              description="Exibida na sidebar e tela de login. Recomendado: 200×200px ou maior."
              currentUrl={form.logoUrl}
              previewUrl={logoPreview}
              onFileSelect={handleLogoSelect}
              onClear={() => { setLogoPreview(null); updateField('logoUrl', null); }}
              uploading={uploadingLogo}
            />
            <UploadField
              label="Favicon"
              description="Ícone da aba do navegador. Recomendado: 32×32px ou 64×64px."
              currentUrl={form.faviconUrl}
              previewUrl={faviconPreview}
              onFileSelect={handleFaviconSelect}
              onClear={() => { setFaviconPreview(null); updateField('faviconUrl', null); }}
              uploading={uploadingFavicon}
            />
            <UploadField
              label="Fundo da Tela de Login (opcional)"
              description="Imagem de background na tela de acesso. Recomendado: 1920×1080px."
              currentUrl={form.loginBackgroundUrl}
              previewUrl={bgPreview}
              onFileSelect={handleBgSelect}
              onClear={() => { setBgPreview(null); updateField('loginBackgroundUrl', null); }}
              uploading={uploadingBg}
            />
          </div>

          <Separator />

          {/* Color pickers */}
          <div className="space-y-5">
            <ColorField
              label="Cor Primária"
              description="Usada em botões, itens ativos da sidebar e elementos de destaque."
              value={form.primaryColor ?? '#8B5CF6'}
              onChange={(v) => updateField('primaryColor', v)}
            />
            <ColorField
              label="Cor Secundária"
              description="Usada como fundo da sidebar."
              value={form.secondaryColor ?? '#1e293b'}
              onChange={(v) => updateField('secondaryColor', v)}
            />
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {uploadingLogo || uploadingFavicon || uploadingBg
                ? 'Enviando imagem...'
                : 'Salvar Identidade Visual'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview ao vivo */}
      <div className="lg:sticky lg:top-6 h-fit">
        <LivePreview form={form} logoPreview={logoPreview} />
      </div>
    </div>
  );
}

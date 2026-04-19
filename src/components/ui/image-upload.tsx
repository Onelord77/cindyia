import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  folder: string;
  maxSizeMB?: number;
  aspectRatio?: 'square' | 'video';
  disabled?: boolean;
  className?: string;
}

const ACCEPTED = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';

export function ImageUpload({
  value,
  onChange,
  bucket,
  folder,
  maxSizeMB = 5,
  aspectRatio = 'square',
  disabled,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Imagem muito grande. Máximo ${maxSizeMB} MB.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onChange(data.publicUrl);
      toast.success('Imagem enviada!');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar imagem: ' + (err.message || 'desconhecido'));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    try {
      const url = new URL(value);
      const parts = url.pathname.split(`/${bucket}/`);
      const objectPath = parts[1];
      if (objectPath) {
        await supabase.storage.from(bucket).remove([objectPath]);
      }
    } catch (err) {
      console.warn('Erro ao remover arquivo do storage:', err);
    }
    onChange(null);
  };

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        <div className={cn('relative w-full overflow-hidden rounded-lg border bg-muted', aspectClass)}>
          <img src={value} alt="Preview" className="h-full w-full object-cover" />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50',
            aspectClass,
            (disabled || isUploading) && 'cursor-not-allowed opacity-50'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Enviando...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-medium">Clique para enviar uma imagem</span>
              <span className="text-xs">PNG, JPG, WebP até {maxSizeMB}MB</span>
            </>
          )}
        </button>
      )}

      {value && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Trocar imagem
        </Button>
      )}
    </div>
  );
}

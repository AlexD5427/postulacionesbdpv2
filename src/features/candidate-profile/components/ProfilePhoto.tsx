'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/design-system/primitives/Button';
import { Alert } from '@/shared/components/Alert';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Profile photo control.
 *
 * In mock mode we keep a local data-URL preview (no upload). For real backends,
 * the DocumentsRepository issues a signed R2 upload URL server-side — the
 * browser never holds storage credentials (see SECURITY.md). We validate type +
 * size on the client for UX; the server must re-validate.
 */
export function ProfilePhoto({
  value,
  displayName,
  onChange,
}: {
  value?: string;
  displayName: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError('Formato no admitido. Usa JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen supera los 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
          {value ? (
            <Image src={value} alt="Foto de perfil" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-xl font-semibold text-muted-foreground">
              {initials || '👤'}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Camera className="h-4 w-4" aria-hidden />
              {value ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Quitar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG o WEBP. Máximo 2 MB.</p>
        </div>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}

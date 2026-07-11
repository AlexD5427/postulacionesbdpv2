'use client';

import { useState } from 'react';
import type { CoverLetter, CoverLetterTemplateKey } from '@/shared/types/domain';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/design-system/primitives/Dialog';
import { Field } from '@/design-system/primitives/Field';
import { Input, Textarea } from '@/design-system/primitives/Input';
import { Button } from '@/design-system/primitives/Button';
import { Select } from '@/design-system/primitives/Select';
import { COVER_LETTER_TEMPLATE_LIST, COVER_LETTER_TEMPLATES } from '../lib/cover-letter-templates';

const MAX = 4000;

export interface CoverLetterDraft {
  id?: string;
  title: string;
  body: string;
  templateKey?: CoverLetterTemplateKey;
}

/** Create/edit dialog for a cover letter. Plain-text storage in the MVP. */
export function CoverLetterEditor({
  open,
  initial,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  initial?: CoverLetter | null;
  onClose: () => void;
  onSave: (draft: CoverLetterDraft) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [templateKey, setTemplateKey] = useState<CoverLetterTemplateKey | ''>(initial?.templateKey ?? '');

  function applyTemplate(key: string) {
    const k = key as CoverLetterTemplateKey;
    setTemplateKey(k || '');
    if (k && COVER_LETTER_TEMPLATES[k]) {
      setBody(COVER_LETTER_TEMPLATES[k].body);
      if (!title) setTitle(COVER_LETTER_TEMPLATES[k].label);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-xl font-semibold">
          {initial ? 'Editar carta' : 'Nueva carta de presentación'}
        </DialogTitle>
        <DialogDescription className="mb-4 mt-1 text-sm text-muted-foreground">
          Personaliza el contenido. Puedes partir de una plantilla y editarla libremente.
        </DialogDescription>

        <div className="flex flex-col gap-4">
          <Field label="Título" required>
            {(f) => <Input {...f} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Carta para banca" />}
          </Field>

          {!initial && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cl-template" className="text-sm font-medium">
                Plantilla (opcional)
              </label>
              <Select
                id="cl-template"
                placeholder="Empezar desde cero"
                options={COVER_LETTER_TEMPLATE_LIST.map((t) => ({ value: t.key, label: t.label }))}
                value={templateKey}
                onChange={(e) => applyTemplate(e.target.value)}
              />
            </div>
          )}

          <Field label="Contenido" required description={`${body.length} / ${MAX} caracteres`}>
            {(f) => (
              <Textarea
                {...f}
                rows={12}
                maxLength={MAX}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe tu carta de presentación…"
              />
            )}
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => onSave({ id: initial?.meta.id, title, body, templateKey: templateKey || undefined })}
              loading={saving}
              disabled={!title.trim() || !body.trim()}
            >
              Guardar carta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

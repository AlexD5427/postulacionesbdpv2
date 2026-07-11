'use client';

import { useState } from 'react';
import { Plus, Pencil, Copy, Trash2, Mail } from 'lucide-react';
import type { CoverLetter } from '@/shared/types/domain';
import {
  useCoverLetters,
  useCreateCoverLetter,
  useDeleteCoverLetter,
  useDuplicateCoverLetter,
  useUpdateCoverLetter,
} from '../hooks/use-cover-letters';
import { useAccount } from '@/features/candidate-profile/hooks/use-profile';
import { CoverLetterEditor, type CoverLetterDraft } from './CoverLetterEditor';
import { Card, CardTitle } from '@/design-system/primitives/Card';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { formatRelative } from '@/shared/utils/dates';

export function CoverLettersView() {
  const { data: account } = useAccount();
  const { data: letters, isLoading } = useCoverLetters();
  const create = useCreateCoverLetter();
  const update = useUpdateCoverLetter();
  const remove = useDeleteCoverLetter();
  const duplicate = useDuplicateCoverLetter();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CoverLetter | null>(null);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(letter: CoverLetter) {
    setEditing(letter);
    setEditorOpen(true);
  }

  async function handleSave(draft: CoverLetterDraft) {
    if (draft.id) {
      await update.mutateAsync({ id: draft.id, patch: { title: draft.title, body: draft.body } });
    } else {
      await create.mutateAsync({
        accountId: account?.identity.id ?? 'anonymous',
        title: draft.title,
        body: draft.body,
        templateKey: draft.templateKey,
        isTemplate: false,
      });
    }
    setEditorOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" aria-hidden />
          Nueva carta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : (letters ?? []).length === 0 ? (
        <GlassSurface variant="standard" radius="3xl" padding="lg" className="flex flex-col items-center gap-3 text-center">
          <Mail className="h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold">Aún no tienes cartas</h2>
          <p className="text-muted-foreground">Crea una carta reutilizable o parte de una plantilla.</p>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden />
            Crear mi primera carta
          </Button>
        </GlassSurface>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(letters ?? []).map((letter) => (
            <Card key={letter.meta.id} className="gap-3">
              <CardTitle className="text-lg">{letter.title}</CardTitle>
              <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{letter.body}</p>
              <p className="text-xs text-muted-foreground">Actualizada {formatRelative(letter.updatedAt)}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(letter)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => duplicate.mutate(letter.meta.id)}>
                  <Copy className="h-4 w-4" aria-hidden />
                  Duplicar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(letter.meta.id)}>
                  <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editorOpen && (
        <CoverLetterEditor
          open={editorOpen}
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
          saving={create.isPending || update.isPending}
        />
      )}
    </div>
  );
}

'use client';

import { AlertTriangle, Send } from 'lucide-react';
import type { PublicAssessmentQuestion } from '@/shared/types/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/design-system/primitives/Dialog';
import { Button } from '@/design-system/primitives/Button';

interface Props {
  open: boolean;
  submitting: boolean;
  missingRequired: PublicAssessmentQuestion[];
  skippedOptional: PublicAssessmentQuestion[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function questionLabel(question: PublicAssessmentQuestion): string {
  return question.questionText || 'Pregunta sin enunciado';
}

/**
 * Confirmation step before the single, irreversible submission.
 *
 * The candidate sees exactly what is missing, split into *required* (blocking)
 * and *optional* (informative), and confirms explicitly. While the request is in
 * flight the confirm button is disabled and shows progress, so a double click
 * cannot produce a second submission even before the `requestId` guard on the
 * server comes into play.
 */
export function SubmitReviewDialog({
  open,
  submitting,
  missingRequired,
  skippedOptional,
  onOpenChange,
  onConfirm,
}: Props) {
  const blocked = missingRequired.length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent aria-describedby="submit-review-description">
        <DialogTitle className="text-xl font-bold">
          {blocked ? 'Faltan respuestas obligatorias' : 'Confirmar envío'}
        </DialogTitle>
        <DialogDescription id="submit-review-description" className="mt-2 text-muted-foreground">
          {blocked
            ? 'Completa estas preguntas antes de enviar. Puedes volver a la evaluación sin perder lo que ya respondiste.'
            : 'Revisa el resumen y envía tus respuestas. El envío es único: después no podrás modificarlas.'}
        </DialogDescription>

        {blocked && (
          <ul className="mt-4 flex max-h-52 flex-col gap-2 overflow-y-auto text-sm">
            {missingRequired.map((question) => (
              <li key={question.questionId} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <span>{questionLabel(question)}</span>
              </li>
            ))}
          </ul>
        )}

        {!blocked && skippedOptional.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <p className="font-medium">
              Dejarás {skippedOptional.length}{' '}
              {skippedOptional.length === 1 ? 'pregunta opcional' : 'preguntas opcionales'} sin responder:
            </p>
            <ul className="flex max-h-40 list-disc flex-col gap-1 overflow-y-auto pl-5 text-muted-foreground">
              {skippedOptional.map((question) => (
                <li key={question.questionId}>{questionLabel(question)}</li>
              ))}
            </ul>
          </div>
        )}

        {!blocked && skippedOptional.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Respondiste todas las preguntas de la evaluación.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" disabled={submitting} onClick={() => onOpenChange(false)}>
            {blocked ? 'Volver a la evaluación' : 'Seguir revisando'}
          </Button>
          {!blocked && (
            <Button loading={submitting} disabled={submitting} onClick={onConfirm}>
              <Send className="h-4 w-4" aria-hidden />
              Enviar respuestas
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

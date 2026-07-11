'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import type { ApplicationAnswer, JobApplication } from '@/shared/types/domain';
import { useJob } from '@/features/jobs/hooks/use-jobs';
import { useProfile } from '@/features/candidate-profile/hooks/use-profile';
import { useCV } from '@/features/cv/hooks/use-cv';
import { useCoverLetters } from '@/features/cv/hooks/use-cover-letters';
import { useAccount } from '@/features/candidate-profile/hooks/use-profile';
import { computeCVCompletion } from '@/features/candidate-profile/lib/completion';
import { useDraftForJob, useSaveDraft, useSubmitApplication } from '../hooks/use-applications';
import { ApplicationQuestionField } from './ApplicationQuestionField';
import { Stepper } from './Stepper';
import { useAutosave } from '@/shared/hooks/use-autosave';
import { Card, CardDescription } from '@/design-system/primitives/Card';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Select } from '@/design-system/primitives/Select';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { Alert } from '@/shared/components/Alert';
import { uuid } from '@/shared/utils/ids';
import { isClosed } from '@/shared/utils/dates';

const STEPS = ['Datos', 'CV', 'Carta', 'Preguntas', 'Declaraciones', 'Revisión'];

export function ApplicationWizard({ jobId }: { jobId: string }) {
  const { data: job, isLoading: loadingJob } = useJob(jobId);
  const { data: profile } = useProfile();
  const { data: account } = useAccount();
  const { data: cv } = useCV();
  const { data: coverLetters } = useCoverLetters();
  const { data: existingDraft, isLoading: loadingDraft } = useDraftForJob(jobId);
  const saveDraft = useSaveDraft();
  const submit = useSubmitApplication();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<JobApplication | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [confirmation, setConfirmation] = useState<{ number: string; id: string } | null>(null);
  const idempotencyKey = useRef<string>(uuid());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Initialise the draft once job + account are available.
  useEffect(() => {
    if (draft || !job || !account) return;
    if (loadingDraft) return;
    if (existingDraft) {
      setDraft(existingDraft);
      idempotencyKey.current = existingDraft.idempotencyKey ?? idempotencyKey.current;
      return;
    }
    const now = new Date().toISOString();
    const id = uuid();
    setDraft({
      meta: { id, externalReference: `APP-${id.slice(0, 8)}`, sourceProvider: 'mock', authoritative: true },
      accountId: account.identity.id,
      jobId: job.meta.id,
      jobReference: job.reference,
      jobTitle: job.title,
      lifecycle: 'draft',
      cvId: cv?.meta.id,
      answers: [],
      submittedAt: null,
      idempotencyKey: idempotencyKey.current,
      actionRequests: [],
      messages: [],
      withdrawable: false,
      createdAt: now,
      updatedAt: now,
    });
  }, [job, account, cv, existingDraft, loadingDraft, draft]);

  // Persist the draft (debounced) as the candidate progresses.
  useAutosave(
    draft,
    async (value) => {
      if (value && value.lifecycle === 'draft') await saveDraft.mutateAsync(value);
    },
    { enabled: Boolean(draft) && !confirmation, delayMs: 1200 },
  );

  // Move focus to the step heading on step change (screen-reader friendly).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const requiredQuestions = useMemo(() => job?.applicationQuestions.filter((q) => q.required) ?? [], [job]);

  if (loadingJob || !draft) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
  }

  if (!job) {
    return (
      <Alert tone="warning" title="Convocatoria no disponible">
        No encontramos esta convocatoria. <Link className="underline" href="/jobs">Ver convocatorias</Link>.
      </Alert>
    );
  }

  if (isClosed(job.closesAt) || job.status !== 'published') {
    return (
      <Alert tone="warning" title="Convocatoria cerrada">
        Esta convocatoria ya no admite postulaciones.{' '}
        <Link className="underline" href="/jobs">Ver otras convocatorias</Link>.
      </Alert>
    );
  }

  function getAnswer(questionId: string) {
    return draft?.answers.find((a) => a.questionId === questionId)?.value;
  }
  function setAnswer(questionId: string, value: ApplicationAnswer['value']) {
    setDraft((prev) => {
      if (!prev) return prev;
      const answers = prev.answers.filter((a) => a.questionId !== questionId);
      answers.push({ questionId, value });
      return { ...prev, answers };
    });
  }

  function questionError(questionId: string): string | undefined {
    if (!attemptedNext) return undefined;
    const q = requiredQuestions.find((x) => x.id === questionId);
    if (!q) return undefined;
    const value = getAnswer(questionId);
    const empty =
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    return empty ? 'Esta pregunta es obligatoria.' : undefined;
  }

  const cvCompletion = computeCVCompletion(cv ?? null);

  function canProceed(): boolean {
    if (step === 3) {
      return requiredQuestions.every((q) => {
        const value = getAnswer(q.id);
        return !(value === undefined || value === '' || (Array.isArray(value) && value.length === 0));
      });
    }
    if (step === 4) return privacyAccepted;
    return true;
  }

  function next() {
    setAttemptedNext(true);
    if (!canProceed()) return;
    setAttemptedNext(false);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() {
    setAttemptedNext(false);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    if (!draft) return;
    const result = await submit.mutateAsync({ application: draft, idempotencyKey: idempotencyKey.current });
    setConfirmation({ number: result.confirmationNumber, id: result.applicationId });
  }

  // --- Confirmation screen ---------------------------------------------------
  if (confirmation) {
    return (
      <GlassSurface variant="elevated" radius="3xl" padding="lg" className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">¡Postulación enviada!</h1>
        <p className="text-muted-foreground">
          Recibimos tu postulación a <strong>{job.title}</strong>. Guarda tu número de confirmación.
        </p>
        <div className="rounded-2xl bg-muted/60 px-6 py-3">
          <p className="text-xs uppercase text-muted-foreground">N.º de confirmación</p>
          <p className="font-mono text-2xl font-bold">{confirmation.number}</p>
        </div>
        <Alert tone="info">
          El banco se comunicará contigo directamente si tu perfil avanza. No mostramos etapas
          internas del proceso.
        </Alert>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/candidate/applications/${confirmation.id}`}>Ver mi postulación</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jobs">Explorar más convocatorias</Link>
          </Button>
        </div>
      </GlassSurface>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Postulación a</p>
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <Badge tone="neutral" className="w-fit">{job.reference}</Badge>
      </div>

      <Stepper steps={STEPS} current={step} />

      <Card className="gap-5">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          {STEPS[step]}
        </h2>

        {/* STEP 0 — Identity/contact review */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <CardDescription>Confirma que tus datos de contacto están actualizados.</CardDescription>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{profile?.firstName} {profile?.lastName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Correo</dt>
                <dd className="font-medium">{account?.identity.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Teléfono</dt>
                <dd className="font-medium">{profile?.contact.phone ?? 'No indicado'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Ciudad</dt>
                <dd className="font-medium">{profile?.contact.city ?? 'No indicada'}</dd>
              </div>
            </dl>
            <Button asChild variant="link" className="w-fit">
              <Link href="/candidate/profile">
                Editar mi perfil <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        )}

        {/* STEP 1 — CV */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <CardDescription>Adjuntaremos tu CV digital a esta postulación.</CardDescription>
            <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
              <div>
                <p className="font-medium">CV digital</p>
                <p className="text-sm text-muted-foreground">{cvCompletion}% completado</p>
              </div>
              <Badge tone={cvCompletion >= 60 ? 'success' : 'warning'}>
                {cvCompletion >= 60 ? 'Listo' : 'Incompleto'}
              </Badge>
            </div>
            {cvCompletion < 60 && (
              <Alert tone="warning">
                Te recomendamos completar más tu CV antes de postular.
              </Alert>
            )}
            <Button asChild variant="link" className="w-fit">
              <Link href="/candidate/cv">
                Editar mi CV <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        )}

        {/* STEP 2 — Cover letter */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <CardDescription>Puedes asociar una carta de presentación (opcional).</CardDescription>
            <Select
              aria-label="Carta de presentación"
              placeholder="Sin carta de presentación"
              options={(coverLetters ?? []).map((l) => ({ value: l.meta.id, label: l.title }))}
              value={draft.coverLetterId ?? ''}
              onChange={(e) => setDraft((prev) => (prev ? { ...prev, coverLetterId: e.target.value || undefined } : prev))}
            />
            <Button asChild variant="link" className="w-fit">
              <Link href="/candidate/cover-letters">
                Crear una carta <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        )}

        {/* STEP 3 — Job questions */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            {job.applicationQuestions.length === 0 ? (
              <CardDescription>Esta convocatoria no tiene preguntas adicionales.</CardDescription>
            ) : (
              job.applicationQuestions
                .sort((a, b) => a.order - b.order)
                .map((question) => (
                  <ApplicationQuestionField
                    key={question.id}
                    question={question}
                    value={getAnswer(question.id)}
                    error={questionError(question.id)}
                    onChange={(value) => setAnswer(question.id, value)}
                  />
                ))
            )}
          </div>
        )}

        {/* STEP 4 — Declarations */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <CardDescription>Antes de enviar, confirma lo siguiente.</CardDescription>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={privacyAccepted} onCheckedChange={(v) => setPrivacyAccepted(v === true)} className="mt-0.5" />
              <span>
                Declaro que la información proporcionada es veraz y autorizo su uso para la gestión de
                esta postulación, conforme al{' '}
                <Link href="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-4">
                  aviso de privacidad
                </Link>
                .
              </span>
            </label>
            {attemptedNext && !privacyAccepted && (
              <p role="alert" className="text-sm font-medium text-danger">
                Debes aceptar la declaración para continuar.
              </p>
            )}
          </div>
        )}

        {/* STEP 5 — Review */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <CardDescription>Revisa tu postulación antes de enviarla.</CardDescription>
            <ul className="flex flex-col divide-y divide-border text-sm">
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">Cargo</span>
                <span className="font-medium">{job.title}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">Candidato/a</span>
                <span className="font-medium">{profile?.firstName} {profile?.lastName}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">CV</span>
                <span className="font-medium">Adjunto ({cvCompletion}%)</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">Carta</span>
                <span className="font-medium">
                  {draft.coverLetterId
                    ? (coverLetters ?? []).find((l) => l.meta.id === draft.coverLetterId)?.title ?? 'Seleccionada'
                    : 'Sin carta'}
                </span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">Preguntas respondidas</span>
                <span className="font-medium">
                  {draft.answers.length} / {job.applicationQuestions.length}
                </span>
              </li>
            </ul>
            {submit.isError && (
              <Alert tone="danger" title="No pudimos enviar tu postulación">
                Inténtalo de nuevo en unos momentos.
              </Alert>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Anterior
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Siguiente
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submit.isPending}>
              Enviar postulación
            </Button>
          )}
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Tu progreso se guarda automáticamente. Puedes volver más tarde para continuar.
      </p>
    </div>
  );
}

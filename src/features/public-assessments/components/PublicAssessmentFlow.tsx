'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, Clock, RefreshCw, Send } from 'lucide-react';
import type {
  PublicAssessment,
  PublicAttemptReceipt,
  PublicParticipant,
} from '@/shared/types/domain';
import type { PublicAssessmentsRepository } from '@/core/data/public-assessments';
import { Card } from '@/design-system/primitives/Card';
import { Button } from '@/design-system/primitives/Button';
import { Progress } from '@/design-system/primitives/Progress';
import { Badge } from '@/design-system/primitives/Badge';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Alert } from '@/shared/components/Alert';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { EvaluationsError, newRequestId } from '@/infrastructure/evaluations/contract';
import { evaluationsEndpoint } from '@/infrastructure/evaluations/endpoint';
import { AccessForm } from './AccessForm';
import { PreflightScreen } from './PreflightScreen';
import { PublicQuestionField } from './PublicQuestionField';
import { SubmitReviewDialog } from './SubmitReviewDialog';
import { AttemptReceipt } from './AttemptReceipt';
import {
  answerableQuestions,
  defaultAnswerValue,
  isAnswered,
  missingRequired as findMissingRequired,
  skippedOptional as findSkippedOptional,
  toAnswerInputs,
  validateAnswer,
  type AnswerMap,
  type PublicAnswerValue,
} from '../model/answers';
import { clearDraft, loadDraft, saveDraft, type AttemptDraft } from '../state/draft-storage';
import {
  useAssessmentLookup,
  usePublicAssessmentsRepository,
  useStartPublicAttempt,
  useSubmitPublicAttempt,
} from '../hooks/use-public-assessment';
import type { AccessFormValues } from '../schemas/access-schema';

type Phase = 'access' | 'preflight' | 'running' | 'done';

interface Attempt {
  attemptId: string;
  startedAt: string;
  assessmentVersion: number;
}

interface Props {
  /** From `?code=` on the public route. */
  initialCode?: string;
  /** Injected in tests; production uses the memoised factory. */
  repository?: PublicAssessmentsRepository;
}

/** Candidate-safe message for any failure. Never a technical detail. */
function messageOf(error: unknown): string {
  if (error instanceof EvaluationsError) return error.userMessage;
  return 'Ocurrió un error inesperado. Inténtalo nuevamente más tarde.';
}

function isConfigurationError(error: unknown): boolean {
  return error instanceof EvaluationsError && error.code === 'CONFIGURATION_ERROR';
}

/**
 * Orchestrator of the temporary public assessment flow.
 *
 * access → preflight (+consent) → running → receipt
 *
 * The two things that make this safe to retry:
 *
 *  · `startRequestId` and `submitRequestId` are created **once per intention**
 *    and held in refs. A retry reuses the same id, so the backend replays it
 *    instead of creating a second attempt.
 *  · The submission freezes the form while it is in flight, so neither a double
 *    click nor the expiry timer can fire it twice.
 */
export function PublicAssessmentFlow({ initialCode, repository }: Props) {
  const repo = usePublicAssessmentsRepository(repository);
  const lookup = useAssessmentLookup(repo);
  const start = useStartPublicAttempt(repo);
  const submit = useSubmitPublicAttempt(repo);

  const [phase, setPhase] = useState<Phase>('access');
  const [participant, setParticipant] = useState<PublicParticipant | null>(null);
  const [assessment, setAssessment] = useState<PublicAssessment | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [receipt, setReceipt] = useState<PublicAttemptReceipt | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [draft, setDraft] = useState<AttemptDraft | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const startRequestId = useRef<string | null>(null);
  const submitRequestId = useRef<string | null>(null);
  const autoSubmitted = useRef(false);
  const sectionHeading = useRef<HTMLHeadingElement>(null);

  const submitting = submit.isPending;
  /** No further edits: submitting, submitted, or out of time. */
  const frozen = submitting || phase === 'done' || timeExpired;

  /* ------------------------------- Timer ---------------------------------- */
  const deadline = useMemo(() => {
    if (!assessment?.durationMinutes || !attempt) return null;
    return new Date(
      new Date(attempt.startedAt).getTime() + assessment.durationMinutes * 60_000,
    ).toISOString();
  }, [assessment, attempt]);

  const countdown = useCountdown(phase === 'running' ? deadline : null);

  /* ---------------------------- Derived state ----------------------------- */
  const sections = assessment?.sections ?? [];
  const section = sections[sectionIndex];
  const questions = assessment ? answerableQuestions(assessment) : [];
  const answeredCount = questions.filter((question) =>
    isAnswered(question, answers[question.questionId] ?? null),
  ).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const missingRequired = assessment ? findMissingRequired(assessment, answers) : [];
  const skippedOptional = assessment ? findSkippedOptional(assessment, answers) : [];

  /* ------------------------------- Actions -------------------------------- */

  const handleAccess = useCallback(
    async (values: AccessFormValues) => {
      setFatal(null);
      lookup.reset();
      start.reset();
      try {
        const loaded = await lookup.mutateAsync(values.publicCode);
        setParticipant({ name: values.fullName, document: values.document });
        setAssessment(loaded);
        setDraft(loadDraft(loaded.publicCode, loaded.assessmentVersion));
        // A fresh identification is a fresh intention: new ids.
        startRequestId.current = null;
        submitRequestId.current = null;
        setPhase('preflight');
      } catch (error) {
        if (isConfigurationError(error)) setFatal(messageOf(error));
      }
    },
    [lookup, start],
  );

  const beginRunning = useCallback((loaded: PublicAssessment, initial: AnswerMap) => {
    const seeded: AnswerMap = { ...initial };
    for (const question of answerableQuestions(loaded)) {
      if (seeded[question.questionId] === undefined) {
        seeded[question.questionId] = defaultAnswerValue(question);
      }
    }
    setAnswers(seeded);
    setSectionIndex(0);
    setShowErrors(false);
    setTimeExpired(false);
    autoSubmitted.current = false;
    setPhase('running');
  }, []);

  const handleStart = useCallback(async () => {
    if (!assessment || !participant) return;
    // Created once; a retry after a failure reuses it, so the backend replays
    // instead of opening a second attempt.
    startRequestId.current ??= newRequestId();
    try {
      const started = await start.mutateAsync({
        requestId: startRequestId.current,
        publicCode: assessment.publicCode,
        participant,
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      });
      submitRequestId.current = newRequestId();
      setAttempt({
        attemptId: started.attemptId,
        startedAt: started.startedAt,
        assessmentVersion: assessment.assessmentVersion,
      });
      clearDraft(assessment.publicCode);
      beginRunning(assessment, {});
    } catch (error) {
      if (isConfigurationError(error)) setFatal(messageOf(error));
      // Other failures stay on the preflight screen with a readable message:
      // starting an assessment we could not register would be worse.
    }
  }, [assessment, participant, start, beginRunning]);

  const handleResume = useCallback(() => {
    if (!assessment || !draft) return;
    submitRequestId.current = draft.submitRequestId;
    setAttempt({
      attemptId: draft.attemptId,
      startedAt: draft.startedAt,
      assessmentVersion: draft.assessmentVersion,
    });
    beginRunning(assessment, draft.answers);
  }, [assessment, draft, beginRunning]);

  const setAnswer = useCallback(
    (questionId: string, value: PublicAnswerValue) => {
      if (frozen) return;
      setAnswers((previous) => ({ ...previous, [questionId]: value }));
    },
    [frozen],
  );

  const goToSection = useCallback(
    (index: number) => {
      if (index < 0 || index >= sections.length) return;
      setSectionIndex(index);
    },
    [sections.length],
  );

  const performSubmit = useCallback(async () => {
    if (!assessment || !participant || !attempt) return;
    if (submitting) return;
    // The id belongs to the intention, not to the request: reused verbatim on
    // every retry (contract rule — a new id would duplicate the attempt).
    submitRequestId.current ??= newRequestId();
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - new Date(attempt.startedAt).getTime()) / 1000),
    );
    try {
      const result = await submit.mutateAsync({
        requestId: submitRequestId.current,
        submission: {
          publicCode: assessment.publicCode,
          attemptId: attempt.attemptId,
          participant,
          answers: toAnswerInputs(assessment, answers),
          userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
          durationSeconds,
        },
      });
      setReceipt(result);
      setReviewOpen(false);
      setPhase('done');
      clearDraft(assessment.publicCode);
    } catch (error) {
      if (isConfigurationError(error)) setFatal(messageOf(error));
      // Close the confirmation dialog so the error and the retry button are
      // reachable in the page: leaving a modal open over them would trap the
      // candidate behind an overlay.
      setReviewOpen(false);
      // Answers stay in state and in the draft; the retry reuses
      // `submitRequestId`, so it cannot duplicate the attempt.
    }
  }, [assessment, participant, attempt, answers, submit, submitting]);

  const openReview = useCallback(() => {
    setShowErrors(true);
    setReviewOpen(true);
  }, []);

  /* -------------------------------- Effects ------------------------------- */

  // Persist a personal-data-free draft so an accidental reload does not lose the
  // attempt (and does not create a second one).
  useEffect(() => {
    if (phase !== 'running' || !assessment || !attempt || !submitRequestId.current) return;
    saveDraft({
      publicCode: assessment.publicCode,
      assessmentVersion: attempt.assessmentVersion,
      attemptId: attempt.attemptId,
      startedAt: attempt.startedAt,
      submitRequestId: submitRequestId.current,
      answers,
    });
  }, [phase, assessment, attempt, answers]);

  // Move focus to the section heading when navigating (screen-reader friendly).
  useEffect(() => {
    if (phase === 'running') sectionHeading.current?.focus();
  }, [sectionIndex, phase]);

  // Out of time: freeze and submit once. The server records the duration but the
  // cut-off is the client's responsibility in this contract.
  useEffect(() => {
    if (phase !== 'running' || !countdown.expired || autoSubmitted.current) return;
    autoSubmitted.current = true;
    setTimeExpired(true);
    void performSubmit();
  }, [countdown.expired, phase, performSubmit]);

  // Native "you have unsaved work" prompt while running. It is the browser's own
  // dialog, not a dark pattern: the candidate can always leave.
  useEffect(() => {
    if (phase !== 'running' || frozen) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase, frozen]);

  /* ------------------------------- Rendering ------------------------------ */

  const demoMode = !repo.live;
  const demoBanner = demoMode ? (
    <Alert tone="warning" title="Modo demostración">
      Este entorno no tiene configurado el servicio de evaluaciones, así que se muestran datos de
      ejemplo y <strong>nada se guarda</strong>.
    </Alert>
  ) : null;

  if (fatal) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <Alert tone="danger" title="La evaluación no está disponible">
          {fatal}
        </Alert>
        <Button asChild variant="glass">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  if (phase === 'done' && receipt && assessment) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        {demoBanner}
        <AttemptReceipt assessmentTitle={assessment.title} receipt={receipt} />
      </div>
    );
  }

  if (phase === 'access') {
    const endpoint = evaluationsEndpoint();
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        {demoBanner}
        {!demoMode && endpoint.status !== 'ready' && (
          <Alert tone="danger" title="Servicio no configurado">
            El portal todavía no tiene configurado el servicio de evaluaciones. Avisa al equipo
            responsable antes de continuar.
          </Alert>
        )}
        <AccessForm
          initialCode={initialCode}
          codeFromLink={Boolean(initialCode)}
          submitting={lookup.isPending}
          errorMessage={lookup.isError ? messageOf(lookup.error) : undefined}
          onSubmit={(values) => void handleAccess(values)}
        />
        {lookup.isPending && <Skeleton className="h-2 w-full rounded-full" />}
      </div>
    );
  }

  if (phase === 'preflight' && assessment) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {demoBanner}
        <PreflightScreen
          assessment={assessment}
          participantName={participant?.name ?? ''}
          starting={start.isPending}
          errorMessage={start.isError ? messageOf(start.error) : undefined}
          resumable={Boolean(draft)}
          onStart={() => void handleStart()}
          onResume={handleResume}
          onCancel={() => {
            setPhase('access');
            setAssessment(null);
            setParticipant(null);
            setDraft(null);
          }}
        />
      </div>
    );
  }

  if (phase !== 'running' || !assessment || !section) return null;

  const isLastSection = sectionIndex === sections.length - 1;
  const lowTime = countdown.remaining !== null && countdown.remaining < 120_000;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {demoBanner}

      {/* Sticky status bar */}
      <div className="glass-navigation sticky top-20 z-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">{assessment.title}</p>
          <p className="text-xs text-muted-foreground">
            Sección {sectionIndex + 1} de {sections.length}: {section.title}
          </p>
        </div>
        {countdown.formatted && (
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums ${
              lowTime ? 'text-danger' : 'text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden />
            {/* Not a live region: a per-second announcement would be hostile. */}
            <span aria-live="off">{countdown.formatted}</span>
            <span className="sr-only">tiempo restante</span>
          </span>
        )}
      </div>

      {lowTime && !timeExpired && (
        <Alert tone="warning" title="Queda poco tiempo">
          Te quedan menos de dos minutos. Cuando el tiempo llegue a cero enviaremos automáticamente lo
          que hayas respondido.
        </Alert>
      )}

      {timeExpired && (
        <Alert tone="warning" title="Se agotó el tiempo">
          Estamos enviando tus respuestas tal como quedaron.
        </Alert>
      )}

      {assessment.navigation.showProgress && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium tabular-nums">
              {answeredCount} / {questions.length}
            </span>
          </div>
          <Progress value={progress} label="Progreso de la evaluación" />
        </div>
      )}

      <Card radius="3xl" padding="lg" className="gap-8">
        <div>
          <h2 ref={sectionHeading} tabIndex={-1} className="text-xl font-semibold outline-none">
            {section.title}
          </h2>
          {section.description && (
            <p className="mt-1 text-muted-foreground">{section.description}</p>
          )}
        </div>

        <ol className="flex list-none flex-col gap-8">
          {section.questions.map((question) => {
            const value = answers[question.questionId] ?? null;
            const error = showErrors ? validateAnswer(question, value) : undefined;
            return (
              <li key={question.questionId}>
                <PublicQuestionField
                  question={question}
                  value={value}
                  error={error}
                  disabled={frozen}
                  onChange={(next) => setAnswer(question.questionId, next)}
                />
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            variant="ghost"
            disabled={sectionIndex === 0 || frozen || !assessment.navigation.allowBack}
            onClick={() => goToSection(sectionIndex - 1)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Anterior
          </Button>
          {isLastSection ? (
            <Button loading={submitting} disabled={frozen} onClick={openReview}>
              <Send className="h-4 w-4" aria-hidden />
              Revisar y enviar
            </Button>
          ) : (
            <Button disabled={frozen} onClick={() => goToSection(sectionIndex + 1)}>
              Siguiente
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </Card>

      {submit.isError && (
        <GlassSurface variant="standard" radius="2xl" padding="md" className="flex flex-col gap-3">
          <Alert tone="danger" title="No pudimos enviar tus respuestas">
            {messageOf(submit.error)} Tus respuestas siguen aquí: puedes reintentar sin perder nada.
          </Alert>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={submitting} disabled={submitting} onClick={() => void performSubmit()}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar el envío
            </Button>
            <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                El reintento usa el mismo identificador de envío, así que no se duplica tu intento.
              </span>
            </span>
          </div>
        </GlassSurface>
      )}

      {showErrors && missingRequired.length > 0 && (
        <Alert tone="warning" title="Faltan respuestas obligatorias">
          Revisa las preguntas marcadas antes de enviar.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>No verás las respuestas correctas: la revisión la hace el equipo del banco.</span>
        <Badge tone="neutral">Versión {assessment.versionLabel || '—'}</Badge>
      </div>

      <SubmitReviewDialog
        open={reviewOpen}
        submitting={submitting}
        missingRequired={missingRequired}
        skippedOptional={skippedOptional}
        onOpenChange={setReviewOpen}
        onConfirm={() => void performSubmit()}
      />
    </div>
  );
}

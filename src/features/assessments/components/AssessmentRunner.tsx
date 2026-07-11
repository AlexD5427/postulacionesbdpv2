'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Send } from 'lucide-react';
import type { AssessmentAnswer, AssessmentAttempt } from '@/shared/types/domain';
import {
  useAssessmentDefinition,
  useAssessmentAttempt,
  useSaveAttempt,
  useStartAttempt,
  useSubmitAttempt,
} from '../hooks/use-assessments';
import { useAssessmentTelemetry } from '../telemetry/use-telemetry';
import { AssessmentConsentScreen } from './AssessmentConsentScreen';
import { QuestionRenderer } from './QuestionRenderer';
import { ConnectionStatus } from './ConnectionStatus';
import { isAnswered, validateAnswer, type AnswerValue } from '../schemas/answer-validation';
import { useCountdown } from '@/shared/hooks/use-countdown';
import { useAutosave } from '@/shared/hooks/use-autosave';
import { Card } from '@/design-system/primitives/Card';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { Progress } from '@/design-system/primitives/Progress';
import { Badge } from '@/design-system/primitives/Badge';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { Alert } from '@/shared/components/Alert';
import { appConfig } from '@/core/config/app-config';

export function AssessmentRunner({ assessmentId }: { assessmentId: string }) {
  const { data: definition, isLoading: loadingDef } = useAssessmentDefinition(assessmentId);
  const { data: serverAttempt, isLoading: loadingAttempt } = useAssessmentAttempt(assessmentId);
  const startMutation = useStartAttempt();
  const saveMutation = useSaveAttempt();
  const submitMutation = useSubmitAttempt();

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const wasResume = useRef(false);
  const recordedEntry = useRef(false);
  const autoSubmitted = useRef(false);
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);

  const telemetry = useAssessmentTelemetry(attempt?.meta.id, definition?.version ?? '0');
  const countdown = useCountdown(attempt?.deadlineAt);

  // Hydrate local attempt from the server (resume path).
  useEffect(() => {
    if (serverAttempt && !attempt) {
      wasResume.current = serverAttempt.status === 'in_progress';
      setAttempt(serverAttempt);
    }
  }, [serverAttempt, attempt]);

  const running = attempt?.status === 'in_progress';
  const submitted = attempt?.status === 'submitted';

  // Record entry event once when the runner becomes active.
  useEffect(() => {
    if (running && !recordedEntry.current) {
      recordedEntry.current = true;
      telemetry.record(wasResume.current ? 'attempt_resumed' : 'attempt_started');
    }
  }, [running, telemetry]);

  // Move focus to the section heading when navigating (screen-reader friendly).
  useEffect(() => {
    if (running) sectionHeadingRef.current?.focus();
  }, [sectionIndex, running]);

  // Persist answers (debounced) while running.
  useAutosave(
    attempt,
    async (value) => {
      if (value && value.status === 'in_progress') {
        await saveMutation.mutateAsync(value);
        telemetry.record('answer_saved');
      }
    },
    { enabled: Boolean(attempt) && running, delayMs: 1500 },
  );

  const sections = useMemo(
    () => (definition ? [...definition.sections].sort((a, b) => a.order - b.order) : []),
    [definition],
  );

  const answersMap = useMemo(() => {
    const map = new Map<string, AnswerValue>();
    attempt?.answers.forEach((a) => map.set(a.questionId, a.value));
    return map;
  }, [attempt]);

  const allQuestions = useMemo(() => sections.flatMap((s) => s.questions), [sections]);
  const answeredCount = allQuestions.filter((q) => isAnswered(q, answersMap.get(q.id) ?? null)).length;
  const progress = allQuestions.length ? Math.round((answeredCount / allQuestions.length) * 100) : 0;

  async function handleStart() {
    const started = await startMutation.mutateAsync(assessmentId);
    const consent = {
      attemptId: started.meta.id,
      consentVersion: definition?.consentVersion ?? '1',
      assessmentVersion: definition?.version ?? '0',
      acceptedInstructions: true,
      acceptedMonitoring: true,
      acceptedAt: new Date().toISOString(),
      locale: appConfig.locale,
      policyReference: appConfig.legal.consentPolicyReference,
    };
    const withConsent: AssessmentAttempt = { ...started, consent };
    await saveMutation.mutateAsync(withConsent);
    setAttempt(withConsent);
    setSectionIndex(0);
  }

  function setAnswer(questionId: string, value: AnswerValue) {
    setAttempt((prev) => {
      if (!prev) return prev;
      const answers: AssessmentAnswer[] = prev.answers.filter((a) => a.questionId !== questionId);
      answers.push({ questionId, value, updatedAt: new Date().toISOString() });
      return { ...prev, answers };
    });
    telemetry.record('answer_changed', { questionId });
  }

  function goToSection(index: number) {
    if (index < 0 || index >= sections.length) return;
    setSectionIndex(index);
    const section = sections[index];
    if (section) telemetry.record('section_changed', { sectionId: section.id });
  }

  function firstInvalidSection(): number | null {
    for (let i = 0; i < sections.length; i += 1) {
      const invalid = sections[i]!.questions.some(
        (q) => validateAnswer(q, answersMap.get(q.id) ?? null) !== undefined,
      );
      if (invalid) return i;
    }
    return null;
  }

  async function handleSubmit() {
    if (!attempt) return;
    setAttemptedSubmit(true);
    if (definition?.submissionPolicy.requireAllRequired) {
      const invalid = firstInvalidSection();
      if (invalid !== null) {
        goToSection(invalid);
        return;
      }
    }
    telemetry.record('submission_started');
    const submittedAttempt = await submitMutation.mutateAsync(attempt);
    setAttempt(submittedAttempt);
    telemetry.record('submission_completed');
    await telemetry.flush();
  }

  // Auto-submit when a timed assessment expires.
  useEffect(() => {
    if (running && countdown.expired && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown.expired, running]);

  if (loadingDef || loadingAttempt) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
  }
  if (!definition) {
    return (
      <Alert tone="warning" title="Evaluación no disponible">
        No encontramos esta evaluación. <Link className="underline" href="/candidate/assessments">Ver mis evaluaciones</Link>.
      </Alert>
    );
  }

  // --- Completion receipt ----------------------------------------------------
  if (submitted) {
    return (
      <GlassSurface variant="elevated" radius="3xl" padding="lg" className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">Evaluación completada</h1>
        <p className="text-muted-foreground">
          Recibimos tu evaluación <strong>{definition.title}</strong>. Gracias por tu tiempo.
        </p>
        <Alert tone="info">
          Esta evaluación es demostrativa y no constituye un diagnóstico. El banco se comunicará
          contigo si tu proceso avanza.
        </Alert>
        <Button asChild>
          <Link href="/candidate/assessments">Volver a mis evaluaciones</Link>
        </Button>
      </GlassSurface>
    );
  }

  // --- Consent / preflight ---------------------------------------------------
  if (!running) {
    return <AssessmentConsentScreen definition={definition} onStart={handleStart} starting={startMutation.isPending || saveMutation.isPending} />;
  }

  // --- Running ---------------------------------------------------------------
  const section = sections[sectionIndex];
  if (!section) return null;
  const isLastSection = sectionIndex === sections.length - 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Sticky status bar */}
      <div className="glass-navigation sticky top-20 z-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">{definition.title}</p>
          <p className="text-xs text-muted-foreground">
            Sección {sectionIndex + 1} de {sections.length}: {section.title}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          {countdown.formatted && (
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${countdown.remaining !== null && countdown.remaining < 60000 ? 'text-danger' : 'text-foreground'}`}>
              <Clock className="h-4 w-4" aria-hidden />
              <span aria-live="off">{countdown.formatted}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progreso</span>
          <span className="font-medium tabular-nums">{answeredCount} / {allQuestions.length}</span>
        </div>
        <Progress value={progress} label="Progreso de la evaluación" />
      </div>

      <Card className="gap-6">
        <div>
          <h2 ref={sectionHeadingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            {section.title}
          </h2>
          {section.description && <p className="mt-1 text-muted-foreground">{section.description}</p>}
        </div>

        <ol className="flex list-none flex-col gap-8">
          {section.questions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((question) => {
              const value = answersMap.get(question.id) ?? null;
              const error = attemptedSubmit ? validateAnswer(question, value) : undefined;
              return (
                <li key={question.id}>
                  <QuestionRenderer question={question} value={value} error={error} onChange={(v) => setAnswer(question.id, v)} />
                </li>
              );
            })}
        </ol>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => goToSection(sectionIndex - 1)} disabled={sectionIndex === 0}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Anterior
          </Button>
          {isLastSection ? (
            <Button onClick={handleSubmit} loading={submitMutation.isPending}>
              <Send className="h-4 w-4" aria-hidden />
              Enviar evaluación
            </Button>
          ) : (
            <Button onClick={() => goToSection(sectionIndex + 1)}>
              Siguiente
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </Card>

      {attemptedSubmit && firstInvalidSection() !== null && (
        <Alert tone="warning" title="Faltan respuestas obligatorias">
          Revisa las preguntas marcadas antes de enviar.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Tus respuestas se guardan automáticamente. Puedes salir y retomar.</span>
        <Badge tone="neutral">{definition.disclaimer.split('.')[0]}.</Badge>
      </div>
    </div>
  );
}

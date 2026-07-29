import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import type { PublicAssessmentsRepository } from '@/core/data/public-assessments';
import type { PublicAttemptSubmission } from '@/shared/types/domain';
import { EvaluationsError } from '@/infrastructure/evaluations/contract';
import { mapPublicAssessment } from '@/infrastructure/evaluations/mapper';
import { PublicAssessmentFlow } from './PublicAssessmentFlow';

/**
 * End-to-end behaviour of the public flow, with the repository injected.
 *
 * The repository is a fake at the **port** level, not a `fetch` stub: that keeps
 * these tests about the flow (identity → preflight → answers → single
 * submission → receipt) while `transport.test.ts` owns the wire details.
 */

vi.mock('@/infrastructure/evaluations/endpoint', () => ({
  evaluationsEndpoint: () => ({ status: 'ready', url: 'https://script.google.com/x/exec', diagnostic: '' }),
  isDemoMode: () => false,
}));

const ASSESSMENT_DTO = {
  publicCode: 'EVL-TEST-0001',
  title: 'Evaluación de prueba',
  description: '',
  instructions: 'Lee cada pregunta con calma.',
  durationMinutes: 10,
  versionLabel: 'v1.0',
  assessmentVersion: 1,
  questionCount: 3,
  theme: { accent: 'cyan', density: 'comfortable', showProgressBar: true },
  navigation: { mode: 'free', allowBack: true, showProgress: true },
  consent: {
    requireConsent: true,
    consentText: 'Consiento el tratamiento de mis respuestas para este proceso.',
    requireDataPrivacyAcceptance: true,
  },
  sections: [
    {
      sectionId: 'sec_1',
      title: 'Primera sección',
      description: '',
      position: 0,
      timeLimitSeconds: null,
      questions: [
        {
          questionId: 'qst_single',
          questionType: 'q_single_choice',
          position: 0,
          questionText: '¿Qué indicador mide la capacidad de pago?',
          description: '',
          helpText: '',
          required: true,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [
            { optionId: 'opt_a', optionValue: 'a', optionText: 'Cuota sobre ingreso', mediaUrl: null },
            { optionId: 'opt_b', optionValue: 'b', optionText: 'Antigüedad del domicilio', mediaUrl: null },
          ],
        },
        {
          questionId: 'qst_text',
          questionType: 'q_short_text',
          position: 1,
          questionText: 'Describe tu experiencia',
          description: '',
          helpText: '',
          required: false,
          configuration: { maxLength: 100 },
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
        {
          questionId: 'qst_upload',
          questionType: 'q_file_response',
          position: 2,
          questionText: 'Adjunta un informe',
          description: '',
          helpText: '',
          required: true,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
      ],
    },
  ],
};

interface FakeRepo extends PublicAssessmentsRepository {
  submissions: Array<{ requestId: string; submission: PublicAttemptSubmission }>;
  startRequestIds: string[];
}

function createFakeRepo(options?: {
  lookupError?: EvaluationsError;
  failSubmitTimes?: number;
  gradingStatus?: string;
  score?: number | null;
}): FakeRepo {
  let remainingFailures = options?.failSubmitTimes ?? 0;
  const repo: FakeRepo = {
    live: true,
    submissions: [],
    startRequestIds: [],
    async getAssessment() {
      if (options?.lookupError) throw options.lookupError;
      return mapPublicAssessment(ASSESSMENT_DTO);
    },
    async startAttempt(requestId) {
      repo.startRequestIds.push(requestId);
      return {
        attemptId: 'att_test_1',
        assessmentVersion: 1,
        versionId: 'ver_1',
        startedAt: new Date().toISOString(),
      };
    },
    async submitAttempt(requestId, submission) {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new EvaluationsError('LOCK_TIMEOUT');
      }
      repo.submissions.push({ requestId, submission });
      return {
        attemptId: submission.attemptId,
        status: 'submitted',
        gradingStatus: options?.gradingStatus ?? 'pending_manual_review',
        received: submission.answers.length,
        ...(options?.score !== undefined ? { score: options.score, passed: null } : {}),
        idempotentReplay: false,
        receivedAt: new Date().toISOString(),
      };
    },
  };
  return repo;
}

function renderFlow(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function identify(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Pérez');
  await user.type(screen.getByLabelText(/^Carnet de Identidad/), '1234567 LP');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /continuar/i }));
}

async function startAttempt(user: ReturnType<typeof userEvent.setup>) {
  const checkboxes = screen.getAllByRole('checkbox');
  for (const checkbox of checkboxes) await user.click(checkbox);
  await user.click(screen.getByRole('button', { name: /comenzar evaluación/i }));
  await screen.findByRole('heading', { name: /primera sección/i });
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PublicAssessmentFlow', () => {
  it('takes a candidate from the link to the receipt without any login', async () => {
    const user = userEvent.setup();
    const repo = createFakeRepo();
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={repo} />);

    await identify(user);

    // Preflight shows what the candidate is about to do.
    expect(await screen.findByRole('heading', { name: /evaluación de prueba/i })).toBeInTheDocument();
    expect(screen.getByText(/lee cada pregunta con calma/i)).toBeInTheDocument();
    // Consent is a real gate.
    expect(screen.getByRole('button', { name: /comenzar evaluación/i })).toBeDisabled();

    await startAttempt(user);
    expect(repo.startRequestIds).toHaveLength(1);

    await user.click(screen.getByRole('radio', { name: /cuota sobre ingreso/i }));
    await user.type(screen.getByLabelText(/describe tu experiencia/i), 'Cinco años en riesgos');

    await user.click(screen.getByRole('button', { name: /revisar y enviar/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /enviar respuestas/i }));

    expect(
      await screen.findByRole('heading', { name: /tus respuestas fueron recibidas correctamente/i }),
    ).toBeInTheDocument();

    expect(repo.submissions).toHaveLength(1);
    const { submission } = repo.submissions[0]!;
    expect(submission.publicCode).toBe('EVL-TEST-0001');
    expect(submission.attemptId).toBe('att_test_1');
    expect(submission.participant).toEqual({ name: 'Ana Pérez', document: '1234567 LP' });
    expect(submission.durationSeconds).toBeGreaterThanOrEqual(0);
    // The disabled `upload` type is never sent, even though it is "required".
    expect(submission.answers).toEqual([
      { questionId: 'qst_single', selectedOptionId: 'opt_a' },
      { questionId: 'qst_text', value: 'Cinco años en riesgos' },
    ]);
  });

  it('never sends grading fields to the backend', async () => {
    const user = userEvent.setup();
    const repo = createFakeRepo();
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={repo} />);

    await identify(user);
    await startAttempt(user);
    await user.click(screen.getByRole('radio', { name: /cuota sobre ingreso/i }));
    await user.click(screen.getByRole('button', { name: /revisar y enviar/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /enviar respuestas/i }));
    await screen.findByRole('heading', { name: /recibidas correctamente/i });

    const serialised = JSON.stringify(repo.submissions[0]!.submission);
    for (const forbidden of ['isCorrect', 'score', 'passed', 'pointsAwarded', 'maxPoints', 'auth']) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it('never renders an answer key, and shows a safe notice for disabled types', async () => {
    const user = userEvent.setup();
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={createFakeRepo()} />);

    await identify(user);
    await startAttempt(user);

    const body = (document.body.textContent ?? '').toLowerCase();
    for (const forbidden of [
      'isCorrect',
      'is_correct',
      'answerKey',
      'scoreValue',
      'passingScore',
      'pointsAwarded',
      'puntaje',
    ]) {
      expect(body).not.toContain(forbidden.toLowerCase());
    }
    // Instead, the runner states plainly that answer keys are not shown.
    expect(
      screen.getByText(/no verás las respuestas correctas/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/requiere adjuntar un archivo y no está habilitado en esta versión/i),
    ).toBeInTheDocument();
  });

  it('shows a generic message for an unavailable code, revealing nothing about its state', async () => {
    const user = userEvent.setup();
    renderFlow(
      <PublicAssessmentFlow
        repository={createFakeRepo({ lookupError: new EvaluationsError('NOT_FOUND') })}
      />,
    );

    await user.type(screen.getByLabelText(/código de la evaluación/i), 'EVL-NO-EXISTE');
    await identify(user);

    expect(await screen.findByText('Esta evaluación no está disponible.')).toBeInTheDocument();
    const body = (document.body.textContent ?? '').toLowerCase();
    for (const leak of ['borrador', 'pausada', 'cerrada', 'archivada', 'draft']) {
      expect(body).not.toContain(leak);
    }
  });

  it('blocks the submission and lists the missing required questions', async () => {
    const user = userEvent.setup();
    const repo = createFakeRepo();
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={repo} />);

    await identify(user);
    await startAttempt(user);
    await user.click(screen.getByRole('button', { name: /revisar y enviar/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/faltan respuestas obligatorias/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/¿qué indicador mide la capacidad de pago\?/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /enviar respuestas/i })).not.toBeInTheDocument();
    expect(repo.submissions).toHaveLength(0);
  });

  it('cannot submit twice on a double click', async () => {
    const user = userEvent.setup();
    const repo = createFakeRepo();
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={repo} />);

    await identify(user);
    await startAttempt(user);
    await user.click(screen.getByRole('radio', { name: /cuota sobre ingreso/i }));
    await user.click(screen.getByRole('button', { name: /revisar y enviar/i }));

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /enviar respuestas/i });
    await user.dblClick(confirm);
    await screen.findByRole('heading', { name: /recibidas correctamente/i });

    expect(repo.submissions).toHaveLength(1);
  });

  it('retries a failed submission with the SAME requestId, so no attempt is duplicated', async () => {
    const user = userEvent.setup();
    const repo = createFakeRepo({ failSubmitTimes: 1 });
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={repo} />);

    await identify(user);
    await startAttempt(user);
    await user.click(screen.getByRole('radio', { name: /cuota sobre ingreso/i }));
    await user.type(screen.getByLabelText(/describe tu experiencia/i), 'Texto que no debe perderse');
    await user.click(screen.getByRole('button', { name: /revisar y enviar/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /enviar respuestas/i }));

    // The failure is explained and the answers survive.
    expect(await screen.findByText(/el servicio está ocupado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/describe tu experiencia/i)).toHaveValue(
      'Texto que no debe perderse',
    );

    const capturedRequestIds: string[] = [];
    const originalSubmit = repo.submitAttempt;
    repo.submitAttempt = async (requestId, submission) => {
      capturedRequestIds.push(requestId);
      return originalSubmit(requestId, submission);
    };

    await user.click(screen.getByRole('button', { name: /reintentar el envío/i }));
    await screen.findByRole('heading', { name: /recibidas correctamente/i });

    expect(repo.submissions).toHaveLength(1);
    expect(capturedRequestIds).toHaveLength(1);
    // Only one attempt was ever opened, and the retry reused its submission id.
    expect(repo.startRequestIds).toHaveLength(1);
    expect(repo.submissions[0]!.requestId).toBe(capturedRequestIds[0]);
  });

  it('shows "under review" and never a zero when grading is pending', async () => {
    const user = userEvent.setup();
    renderFlow(
      <PublicAssessmentFlow
        initialCode="EVL-TEST-0001"
        repository={createFakeRepo({ gradingStatus: 'pending_manual_review', score: null })}
      />,
    );

    await identify(user);
    await startAttempt(user);
    await user.click(screen.getByRole('radio', { name: /cuota sobre ingreso/i }));
    await user.click(screen.getByRole('button', { name: /revisar y enviar/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /enviar respuestas/i }));

    expect(await screen.findByText(/tus respuestas están en revisión/i)).toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it('keeps answers when moving between questions and shows progress', async () => {
    const user = userEvent.setup();
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={createFakeRepo()} />);

    await identify(user);
    await startAttempt(user);

    await user.type(screen.getByLabelText(/describe tu experiencia/i), 'Persistente');
    await user.click(screen.getByRole('radio', { name: /cuota sobre ingreso/i }));

    expect(screen.getByLabelText(/describe tu experiencia/i)).toHaveValue('Persistente');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('freezes the form and submits once when the time runs out', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const repo = createFakeRepo();
    renderFlow(<PublicAssessmentFlow initialCode="EVL-TEST-0001" repository={repo} />);

    await identify(user);
    await startAttempt(user);
    await user.click(screen.getByRole('radio', { name: /cuota sobre ingreso/i }));

    // 10 minutes is the duration in the fixture.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1500);
    });

    await waitFor(() => expect(repo.submissions).toHaveLength(1));
    expect(
      await screen.findByRole('heading', { name: /recibidas correctamente/i }),
    ).toBeInTheDocument();
    // The answer the candidate had at the cut-off is the one that was sent.
    expect(repo.submissions[0]!.submission.answers).toEqual([
      { questionId: 'qst_single', selectedOptionId: 'opt_a' },
    ]);
  });
});

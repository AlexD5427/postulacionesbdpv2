import type { PublicAssessmentsRepository } from '@/core/data/public-assessments';
import type { PublicAssessment } from '@/shared/types/domain';
import { EvaluationsError } from './contract';
import { mapPublicAssessment } from './mapper';

/**
 * Local demo adapter for the public assessment module.
 *
 * Used **only** when no Evaluations endpoint is configured and the deployment is
 * explicitly in mock mode (see `endpoint.ts → isDemoMode`). It exists so the
 * flow can be developed, reviewed and end-to-end tested without a Google
 * account — never as a silent production fallback: without an endpoint in a real
 * deployment the flow shows a configuration error instead of pretending that an
 * attempt was stored.
 *
 * The payloads below are written in the **raw backend DTO shape** and go through
 * the same mapper and the same Zod schemas as production data, so the demo can
 * never drift into a shape the real contract does not allow.
 */

export const DEMO_PUBLIC_CODE = 'EVL-DEMO-2026';
/** Demo-only code whose first submission fails, to exercise retry + idempotency. */
export const DEMO_RETRY_CODE = 'EVL-DEMO-REINTENTO';

function option(id: string, text: string, value = id) {
  return { optionId: id, optionValue: value, optionText: text, mediaUrl: null };
}

const DEMO_DTO = {
  publicCode: DEMO_PUBLIC_CODE,
  title: 'Evaluación de demostración · Analista de Riesgo',
  description: 'Ejemplo local para desarrollo y pruebas del módulo público.',
  instructions:
    'Responde con calma. Puedes moverte entre secciones sin perder lo que ya escribiste. Al final verás un resumen antes de enviar.',
  durationMinutes: 30,
  versionLabel: 'v1.0',
  assessmentVersion: 1,
  questionCount: 12,
  theme: { accent: 'cyan', density: 'comfortable', showProgressBar: true },
  navigation: { mode: 'free', allowBack: true, showProgress: true },
  consent: {
    requireConsent: true,
    consentText:
      'Esta evaluación es de demostración. Al continuar aceptas que tus respuestas se registren para el proceso de selección correspondiente.',
    requireDataPrivacyAcceptance: true,
  },
  sections: [
    {
      sectionId: 'sec_demo_1',
      title: 'Conocimientos',
      description: 'Preguntas de opción y verdadero/falso.',
      position: 0,
      timeLimitSeconds: null,
      questions: [
        {
          questionId: 'qst_demo_intro',
          questionType: 'c_paragraph',
          position: 0,
          questionText: 'Antes de comenzar',
          description:
            'Esta sección evalúa conceptos generales de riesgo crediticio. No hay preguntas capciosas.',
          helpText: '',
          required: false,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
        {
          questionId: 'qst_demo_single',
          questionType: 'q_single_choice',
          position: 1,
          questionText: '¿Qué indicador mide la capacidad de pago de un solicitante?',
          description: '',
          helpText: 'Selecciona una sola opción.',
          required: true,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [
            option('opt_demo_s1', 'Relación cuota / ingreso'),
            option('opt_demo_s2', 'Antigüedad del domicilio'),
            option('opt_demo_s3', 'Número de sucursales visitadas'),
          ],
        },
        {
          questionId: 'qst_demo_multi',
          questionType: 'q_multiple_choice',
          position: 2,
          questionText: '¿Qué documentos respaldan un ingreso independiente?',
          description: '',
          helpText: 'Puedes elegir varias opciones.',
          required: true,
          configuration: { minSelections: 1 },
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [
            option('opt_demo_m1', 'Declaraciones impositivas'),
            option('opt_demo_m2', 'Extractos bancarios'),
            option('opt_demo_m3', 'Fotografía del negocio'),
          ],
        },
        {
          questionId: 'qst_demo_tf',
          questionType: 'q_true_false',
          position: 3,
          questionText: 'Una garantía real elimina por completo el riesgo de crédito.',
          description: '',
          helpText: '',
          required: true,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [option('opt_demo_tf1', 'Verdadero', 'true'), option('opt_demo_tf2', 'Falso', 'false')],
        },
        {
          questionId: 'qst_demo_dropdown',
          questionType: 'q_dropdown',
          position: 4,
          questionText: '¿Qué área revisa la clasificación final de un cliente?',
          description: '',
          helpText: '',
          required: false,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [
            option('opt_demo_d1', 'Riesgos'),
            option('opt_demo_d2', 'Marketing'),
            option('opt_demo_d3', 'Logística'),
          ],
        },
      ],
    },
    {
      sectionId: 'sec_demo_2',
      title: 'Datos y criterio',
      description: 'Campos numéricos, fechas y escalas.',
      position: 1,
      timeLimitSeconds: null,
      questions: [
        {
          questionId: 'qst_demo_int',
          questionType: 'q_integer',
          position: 0,
          questionText: '¿Cuántos años de experiencia tienes en análisis de crédito?',
          description: '',
          helpText: '',
          required: true,
          configuration: { min: 0, max: 50 },
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
        {
          questionId: 'qst_demo_currency',
          questionType: 'q_currency',
          position: 1,
          questionText: 'Monto máximo que aprobaste de forma autónoma.',
          description: '',
          helpText: 'Usa números, sin puntos ni comas.',
          required: false,
          configuration: { currency: 'BOB', decimals: 2, min: 0 },
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
        {
          questionId: 'qst_demo_date',
          questionType: 'q_date',
          position: 2,
          questionText: '¿Desde qué fecha estás disponible?',
          description: '',
          helpText: '',
          required: false,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
        {
          questionId: 'qst_demo_likert',
          questionType: 'q_likert',
          position: 3,
          questionText: 'Me resulta cómodo explicar una negativa de crédito a un cliente.',
          description: '',
          helpText: '',
          required: true,
          configuration: {
            scaleMin: 1,
            scaleMax: 5,
            labelMin: 'Totalmente en desacuerdo',
            labelMax: 'Totalmente de acuerdo',
          },
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [
            option('opt_demo_l1', 'Totalmente en desacuerdo', '1'),
            option('opt_demo_l2', 'En desacuerdo', '2'),
            option('opt_demo_l3', 'Neutral', '3'),
            option('opt_demo_l4', 'De acuerdo', '4'),
            option('opt_demo_l5', 'Totalmente de acuerdo', '5'),
          ],
        },
        {
          questionId: 'qst_demo_ranking',
          questionType: 'q_ranking',
          position: 4,
          questionText: 'Ordena los pasos de una evaluación de crédito.',
          description: '',
          helpText: 'Usa los botones para subir o bajar cada elemento.',
          required: true,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [
            option('opt_demo_r1', 'Recepción de la solicitud'),
            option('opt_demo_r2', 'Verificación de ingresos'),
            option('opt_demo_r3', 'Dictamen y resolución'),
          ],
        },
      ],
    },
    {
      sectionId: 'sec_demo_3',
      title: 'Situaciones',
      description: 'Respuestas abiertas que revisa una persona.',
      position: 2,
      timeLimitSeconds: null,
      questions: [
        {
          questionId: 'qst_demo_short',
          questionType: 'q_short_text',
          position: 0,
          questionText: 'En una frase, ¿qué es para ti un crédito responsable?',
          description: '',
          helpText: '',
          required: true,
          configuration: { maxLength: 160, placeholder: 'Escribe tu respuesta' },
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
        {
          questionId: 'qst_demo_scenario',
          questionType: 'q_scenario',
          position: 1,
          questionText:
            'Un cliente recurrente pide ampliar su crédito, pero su negocio bajó de ventas. ¿Cómo procedes?',
          description:
            'Considera el riesgo de la operación, la relación con el cliente y las políticas del banco.',
          helpText: '',
          required: false,
          configuration: { rows: 6, maxLength: 2000 },
          media: null,
          accessibility: {
            ariaLabel: '',
            longDescription:
              'Se espera que describas los pasos que seguirías y qué información pedirías antes de decidir.',
          },
          options: [],
        },
        {
          questionId: 'qst_demo_upload',
          questionType: 'q_file_response',
          position: 2,
          questionText: 'Adjunta un ejemplo de informe de riesgo.',
          description: '',
          helpText: '',
          required: false,
          configuration: {},
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
      ],
    },
  ],
};

const RETRY_DTO = {
  ...DEMO_DTO,
  publicCode: DEMO_RETRY_CODE,
  title: 'Evaluación de demostración · reintento',
  durationMinutes: null,
  questionCount: 1,
  consent: { requireConsent: false, consentText: '', requireDataPrivacyAcceptance: true },
  sections: [
    {
      sectionId: 'sec_retry_1',
      title: 'Única sección',
      description: '',
      position: 0,
      timeLimitSeconds: null,
      questions: [
        {
          questionId: 'qst_retry_1',
          questionType: 'q_short_text',
          position: 0,
          questionText: '¿Por qué te interesa esta posición?',
          description: '',
          helpText: '',
          required: true,
          configuration: { maxLength: 200 },
          media: null,
          accessibility: { ariaLabel: '', longDescription: '' },
          options: [],
        },
      ],
    },
  ],
};

const DEMO_ASSESSMENTS: Record<string, unknown> = {
  [DEMO_PUBLIC_CODE]: DEMO_DTO,
  [DEMO_RETRY_CODE]: RETRY_DTO,
};

/** Attempts created in this browser session. Demo state only; never persisted. */
const attempts = new Map<string, { publicCode: string; submitted: boolean }>();
/** `requestId`s already seen, to reproduce the backend's idempotent replay. */
const processedRequests = new Map<string, { attemptId: string; received: number }>();
/** `requestId`s that were rejected once, so a retry with the SAME id succeeds. */
const failedOnce = new Set<string>();

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_demo${String(counter).padStart(4, '0')}`;
}

/** Reset demo state. Test helper. */
export function __resetDemoState(): void {
  attempts.clear();
  processedRequests.clear();
  failedOnce.clear();
  counter = 0;
}

export function createDemoPublicAssessmentsRepository(): PublicAssessmentsRepository {
  return {
    live: false,

    async getAssessment(publicCode): Promise<PublicAssessment> {
      const raw = DEMO_ASSESSMENTS[publicCode.trim().toUpperCase()];
      if (!raw) throw new EvaluationsError('NOT_FOUND', { message: 'demo code not found' });
      return mapPublicAssessment(raw);
    },

    async startAttempt(_requestId, input) {
      const code = input.publicCode.trim().toUpperCase();
      if (!DEMO_ASSESSMENTS[code]) {
        throw new EvaluationsError('NOT_FOUND', { message: 'demo code not found' });
      }
      const attemptId = nextId('att');
      attempts.set(attemptId, { publicCode: code, submitted: false });
      return {
        attemptId,
        assessmentVersion: 1,
        versionId: 'ver_demo0001',
        startedAt: new Date().toISOString(),
      };
    },

    async submitAttempt(requestId, submission) {
      const replay = processedRequests.get(requestId);
      if (replay) {
        return {
          attemptId: replay.attemptId,
          status: 'submitted',
          gradingStatus: 'pending_manual_review',
          received: replay.received,
          idempotentReplay: true,
          receivedAt: new Date().toISOString(),
        };
      }

      const attempt = attempts.get(submission.attemptId);
      if (!attempt) throw new EvaluationsError('NOT_FOUND', { message: 'demo attempt not found' });
      if (attempt.submitted) throw new EvaluationsError('CONFLICT', { message: 'already submitted' });

      // Demo-only: the retry assessment fails the first time each new
      // `requestId` is seen, so the UI's "retry with the same id" path is
      // reachable end to end.
      if (attempt.publicCode === DEMO_RETRY_CODE && !failedOnce.has(requestId)) {
        failedOnce.add(requestId);
        throw new EvaluationsError('LOCK_TIMEOUT', { message: 'demo forced failure' });
      }

      attempt.submitted = true;
      processedRequests.set(requestId, {
        attemptId: submission.attemptId,
        received: submission.answers.length,
      });
      return {
        attemptId: submission.attemptId,
        status: 'submitted',
        gradingStatus: 'pending_manual_review',
        received: submission.answers.length,
        idempotentReplay: false,
        receivedAt: new Date().toISOString(),
      };
    },
  };
}

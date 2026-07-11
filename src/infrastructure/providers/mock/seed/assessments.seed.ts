import type { AssessmentDefinition, AssessmentInvitation } from '@/shared/types/domain';
import { mockMeta } from './meta';

/**
 * Original, non-clinical demonstration assessments for the MVP.
 *
 * IMPORTANT: no proprietary/vendor questions are used. Every assessment carries
 * the mandated disclaimer. Correct answers are never encoded in these
 * candidate-facing definitions.
 */
const DISCLAIMER =
  'Evaluación demostrativa para el MVP. No es un diagnóstico clínico ni psicológico y no se presenta como un instrumento psicométrico validado.';

const KEYBOARD_INSTRUCTIONS =
  'Puedes navegar con la tecla Tab, seleccionar opciones con la barra espaciadora o Enter, y avanzar entre secciones con los botones "Anterior" y "Siguiente".';

function baseAccessibility() {
  return {
    keyboardInstructions: KEYBOARD_INSTRUCTIONS,
    accommodationsContact: 'accesibilidad@bdp.com.bo',
  };
}

// --- Oficial de Créditos -----------------------------------------------------
const creditOfficer: AssessmentDefinition = {
  meta: mockMeta('assessment-credit-officer', 'ASSESS-CRE-001'),
  title: 'Evaluación demostrativa — Oficial de Créditos',
  version: '1.0.0',
  instructions:
    'Esta evaluación explora razonamiento numérico, interpretación de casos de crédito, atención al detalle, servicio al cliente, juicio ético y expresión escrita. Tómate tu tiempo; no hay penalización por reflexionar.',
  disclaimer: DISCLAIMER,
  estimatedMinutes: 25,
  attemptPolicy: { maxAttempts: 1, allowResume: true },
  timing: { mode: 'untimed' },
  consentVersion: '2026-01',
  monitoringPolicyVersion: '2026-01',
  accessibility: baseAccessibility(),
  submissionPolicy: { requireAllRequired: true },
  sections: [
    {
      id: 'cre-sec-num',
      title: 'Razonamiento numérico básico',
      order: 1,
      questions: [
        {
          id: 'cre-num-1',
          type: 'numeric',
          prompt:
            'Un cliente solicita un crédito de Bs 24.000 a pagar en 12 cuotas mensuales iguales, sin intereses para este ejercicio. ¿Cuál es el monto de cada cuota (en Bs)?',
          required: true,
          order: 1,
          min: 0,
        },
        {
          id: 'cre-num-2',
          type: 'single_choice',
          prompt:
            'Si una tasa de interés anual es 18%, ¿cuál es la tasa mensual equivalente simple aproximada?',
          required: true,
          order: 2,
          options: [
            { id: 'a', label: '1,5%' },
            { id: 'b', label: '3%' },
            { id: 'c', label: '0,18%' },
            { id: 'd', label: '18%' },
          ],
        },
      ],
    },
    {
      id: 'cre-sec-case',
      title: 'Interpretación de casos de crédito',
      order: 2,
      questions: [
        {
          id: 'cre-case-1',
          type: 'table_interpretation',
          prompt:
            'Observa los ingresos y egresos mensuales del solicitante. ¿Cuál es su capacidad de ahorro mensual aproximada?',
          required: true,
          order: 1,
          table: {
            columns: ['Concepto', 'Monto (Bs)'],
            rows: [
              ['Ingresos por ventas', '9.000'],
              ['Costos de mercadería', '4.500'],
              ['Gastos operativos', '1.800'],
              ['Gastos del hogar', '1.500'],
            ],
          },
          options: [
            { id: 'a', label: 'Bs 1.200' },
            { id: 'b', label: 'Bs 2.700' },
            { id: 'c', label: 'Bs 4.500' },
            { id: 'd', label: 'Bs 900' },
          ],
        },
        {
          id: 'cre-case-2',
          type: 'scenario',
          prompt: '¿Qué acción es la más adecuada como primer paso?',
          scenario:
            'Una emprendedora solicita ampliar su crédito. Sus ventas crecieron, pero notas que dos cuotas anteriores se pagaron con atraso leve.',
          required: true,
          order: 2,
          options: [
            { id: 'a', label: 'Rechazar la solicitud de inmediato.' },
            { id: 'b', label: 'Aprobar el máximo posible para fidelizarla.' },
            {
              id: 'c',
              label:
                'Analizar la causa de los atrasos y evaluar la capacidad de pago actualizada antes de decidir.',
            },
            { id: 'd', label: 'Derivar el caso sin revisar información.' },
          ],
        },
      ],
    },
    {
      id: 'cre-sec-detail',
      title: 'Atención al detalle',
      order: 3,
      questions: [
        {
          id: 'cre-detail-1',
          type: 'single_choice',
          prompt:
            'En un formulario, el nombre aparece como "María Fernández Q." y en el carnet como "Maria Fernandez Quispe". ¿Qué corresponde hacer?',
          required: true,
          order: 1,
          options: [
            { id: 'a', label: 'Ignorar la diferencia.' },
            { id: 'b', label: 'Verificar y registrar el nombre completo tal como figura en el documento oficial.' },
            { id: 'c', label: 'Usar el que suene mejor.' },
          ],
        },
      ],
    },
    {
      id: 'cre-sec-service',
      title: 'Servicio al cliente',
      order: 4,
      questions: [
        {
          id: 'cre-service-1',
          type: 'likert',
          prompt:
            'Indica tu grado de acuerdo: "Es importante explicar con claridad las condiciones del crédito, aunque tome más tiempo".',
          required: true,
          order: 1,
          scale: { min: 1, max: 5, minLabel: 'Muy en desacuerdo', maxLabel: 'Muy de acuerdo' },
        },
      ],
    },
    {
      id: 'cre-sec-ethics',
      title: 'Juicio ético',
      order: 5,
      questions: [
        {
          id: 'cre-ethics-1',
          type: 'scenario',
          prompt: '¿Cuál es la respuesta más apropiada?',
          scenario:
            'Un cliente te ofrece un obsequio para agilizar la aprobación de su crédito.',
          required: true,
          order: 1,
          options: [
            { id: 'a', label: 'Aceptar el obsequio discretamente.' },
            { id: 'b', label: 'Rechazarlo cordialmente y explicar la política de integridad del banco.' },
            { id: 'c', label: 'Aceptarlo y aprobar más rápido.' },
          ],
        },
      ],
    },
    {
      id: 'cre-sec-written',
      title: 'Respuesta escrita',
      order: 6,
      questions: [
        {
          id: 'cre-written-1',
          type: 'long_text',
          prompt:
            'Describe cómo explicarías a un cliente, en lenguaje sencillo, la diferencia entre capital e interés.',
          required: true,
          order: 1,
          maxLength: 800,
          helpText: 'No hay una única respuesta correcta; valoramos la claridad.',
        },
      ],
    },
  ],
};

// --- Gerente de Agencia ------------------------------------------------------
const branchManager: AssessmentDefinition = {
  meta: mockMeta('assessment-branch-manager', 'ASSESS-GER-002'),
  title: 'Evaluación demostrativa — Gerente de Agencia',
  version: '1.0.0',
  instructions:
    'Esta evaluación explora liderazgo situacional, priorización operativa, respuesta a reclamos, manejo de conflictos, juicio ético y planificación comercial básica.',
  disclaimer: DISCLAIMER,
  estimatedMinutes: 30,
  attemptPolicy: { maxAttempts: 1, allowResume: true },
  timing: { mode: 'untimed' },
  consentVersion: '2026-01',
  monitoringPolicyVersion: '2026-01',
  accessibility: baseAccessibility(),
  submissionPolicy: { requireAllRequired: true },
  sections: [
    {
      id: 'ger-sec-lead',
      title: 'Liderazgo situacional',
      order: 1,
      questions: [
        {
          id: 'ger-lead-1',
          type: 'scenario',
          prompt: '¿Qué enfoque priorizarías?',
          scenario:
            'Un colaborador con buen desempeño se muestra desmotivado tras un cambio de procesos.',
          required: true,
          order: 1,
          options: [
            { id: 'a', label: 'Ignorarlo hasta que se adapte solo.' },
            { id: 'b', label: 'Conversar para entender su situación y acordar apoyo concreto.' },
            { id: 'c', label: 'Amonestarlo formalmente.' },
          ],
        },
      ],
    },
    {
      id: 'ger-sec-prior',
      title: 'Priorización operativa',
      order: 2,
      questions: [
        {
          id: 'ger-prior-1',
          type: 'ranking',
          prompt:
            'Ordena estas tareas de mayor a menor prioridad para el inicio de la jornada.',
          required: true,
          order: 1,
          rankingItems: [
            { id: 'r1', label: 'Resolver una caja descuadrada del día anterior.' },
            { id: 'r2', label: 'Responder un correo interno no urgente.' },
            { id: 'r3', label: 'Atender a un cliente que espera desde temprano.' },
            { id: 'r4', label: 'Planificar la reunión semanal.' },
          ],
        },
      ],
    },
    {
      id: 'ger-sec-complaint',
      title: 'Respuesta a reclamos',
      order: 3,
      questions: [
        {
          id: 'ger-complaint-1',
          type: 'long_text',
          prompt:
            'Un cliente está molesto por una demora. En pocas líneas, ¿cómo iniciarías la conversación?',
          required: true,
          order: 1,
          maxLength: 600,
        },
      ],
    },
    {
      id: 'ger-sec-ethics',
      title: 'Juicio ético',
      order: 4,
      questions: [
        {
          id: 'ger-ethics-1',
          type: 'true_false',
          prompt:
            'Como gerente, es aceptable modificar registros para alcanzar una meta mensual.',
          required: true,
          order: 1,
        },
      ],
    },
    {
      id: 'ger-sec-plan',
      title: 'Planificación comercial básica',
      order: 5,
      questions: [
        {
          id: 'ger-plan-1',
          type: 'numeric',
          prompt:
            'Si la meta mensual es Bs 300.000 y quedan 6 días hábiles con un promedio diario de Bs 40.000, ¿cuánto faltaría respecto a la meta (en Bs)?',
          required: true,
          order: 1,
        },
      ],
    },
  ],
};

// --- Cajero/a de Banca -------------------------------------------------------
const bankTeller: AssessmentDefinition = {
  meta: mockMeta('assessment-bank-teller', 'ASSESS-CAJ-003'),
  title: 'Evaluación demostrativa — Cajero/a de Banca',
  version: '1.0.0',
  instructions:
    'Esta evaluación explora atención al detalle, precisión numérica, servicio al cliente y juicio de procedimientos.',
  disclaimer: DISCLAIMER,
  estimatedMinutes: 15,
  attemptPolicy: { maxAttempts: 1, allowResume: true },
  timing: { mode: 'total', totalMinutes: 20 },
  consentVersion: '2026-01',
  monitoringPolicyVersion: '2026-01',
  accessibility: baseAccessibility(),
  submissionPolicy: { requireAllRequired: true },
  sections: [
    {
      id: 'caj-sec-detail',
      title: 'Atención al detalle',
      order: 1,
      questions: [
        {
          id: 'caj-detail-1',
          type: 'single_choice',
          prompt: '¿Cuál de estos montos está escrito correctamente en palabras para Bs 1.250,50?',
          required: true,
          order: 1,
          options: [
            { id: 'a', label: 'Mil doscientos cincuenta 50/100 bolivianos' },
            { id: 'b', label: 'Mil doscientos cinco 50/100 bolivianos' },
            { id: 'c', label: 'Mil dos cincuenta bolivianos' },
          ],
        },
      ],
    },
    {
      id: 'caj-sec-num',
      title: 'Precisión numérica',
      order: 2,
      questions: [
        {
          id: 'caj-num-1',
          type: 'numeric',
          prompt: 'Un cliente deposita Bs 3.450 y luego Bs 780. ¿Cuál es el total depositado (en Bs)?',
          required: true,
          order: 1,
        },
      ],
    },
    {
      id: 'caj-sec-service',
      title: 'Servicio y procedimientos',
      order: 3,
      questions: [
        {
          id: 'caj-service-1',
          type: 'scenario',
          prompt: '¿Qué corresponde hacer?',
          scenario: 'Al cierre notas un billete presuntamente falso recibido durante el día.',
          required: true,
          order: 1,
          options: [
            { id: 'a', label: 'Guardarlo sin reportar.' },
            { id: 'b', label: 'Seguir el procedimiento de reporte establecido por el banco.' },
            { id: 'c', label: 'Devolverlo al azar a otro cliente.' },
          ],
        },
      ],
    },
  ],
};

export const seedAssessments: AssessmentDefinition[] = [creditOfficer, branchManager, bankTeller];

export const seedInvitations: AssessmentInvitation[] = [
  {
    id: 'invitation-credit-officer',
    assessmentId: 'assessment-credit-officer',
    assessmentTitle: creditOfficer.title,
    jobId: 'job-credit-officer',
    jobTitle: 'Oficial de Créditos',
    invitedAt: '2026-01-12T15:00:00.000Z',
    expiresAt: '2026-03-10T23:59:00.000Z',
    status: 'pending',
  },
];

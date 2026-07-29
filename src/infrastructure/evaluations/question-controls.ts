import type { PublicQuestionControl } from '@/shared/types/domain';

/**
 * Mirror of the ATS question-type registry, reduced to what a renderer needs.
 *
 * The backend sends `questionType` (`q_single_choice`, `c_paragraph`, …); the
 * runner must not branch on those 50+ identifiers. This table maps each type to
 * its **control family**, exactly as declared in the ATS registry
 * (`src/features/assessments/question-types/answerPlugins.ts`,
 * `contentPlugins.ts`, `advancedContracts.ts`) and documented in
 * `docs/evaluations/QUESTION_TYPES.md`.
 *
 * An unknown type is not a crash and not a guess: it maps to `unsupported`, the
 * runner shows a safe notice and no answer is ever sent for it. That keeps the
 * portal forward-compatible with a backend that adds a type before the portal
 * is redeployed.
 */
const CONTROL_BY_TYPE: Record<string, PublicQuestionControl> = {
  // --- Content blocks (never collect an answer) -----------------------------
  c_title: 'content',
  c_subtitle: 'content',
  c_paragraph: 'content',
  c_rich_text: 'content',
  c_instructions: 'content',
  c_callout: 'content',
  c_divider: 'content',
  c_page_break: 'content',
  c_image: 'content',
  c_video: 'content',
  c_audio: 'content',
  c_resource: 'content',

  // --- Option families -----------------------------------------------------
  q_single_choice: 'radio',
  q_true_false: 'radio',
  q_yes_no_na: 'radio',
  q_image_choice: 'radio',
  q_likert: 'radio',
  q_multiple_choice: 'checkbox',
  q_multiselect: 'checkbox',
  q_dropdown: 'select',

  // --- Text ----------------------------------------------------------------
  q_short_text: 'text',
  q_long_text: 'textarea',
  q_scenario: 'textarea',
  q_multi_step_case: 'textarea',
  q_chart_interpretation: 'textarea',

  // --- Numeric -------------------------------------------------------------
  q_integer: 'number',
  q_decimal: 'number',
  q_percentage: 'number',
  q_currency: 'number',
  q_numeric_scale: 'number',
  q_stars: 'number',

  // --- Date / time ---------------------------------------------------------
  q_date: 'date',
  q_time: 'time',
  q_datetime: 'datetime',

  // --- Ordering / matching -------------------------------------------------
  q_ranking: 'ordering',
  q_ordering: 'ordering',
  q_matching: 'ordering',
  q_categorization: 'ordering',

  // --- Matrices ------------------------------------------------------------
  q_matrix: 'matrix',
  q_likert_matrix: 'matrix',
  q_editable_table: 'matrix',

  // --- Disabled in this beta ----------------------------------------------
  q_file_response: 'upload',
  q_hotspot: 'pending',
  q_code: 'pending',
  q_sql: 'pending',
  q_spreadsheet_sim: 'pending',
  q_interactive_video: 'pending',
  q_credit_analysis: 'pending',
  q_risk_analysis: 'pending',
  q_cashier_sim: 'pending',
  q_reconciliation: 'pending',
  q_customer_service_sim: 'pending',
  q_operations_sim: 'pending',
  q_financial_statements: 'pending',
};

/** Control families the beta runner can actually collect an answer with. */
const ANSWERABLE_CONTROLS = new Set<PublicQuestionControl>([
  'radio',
  'checkbox',
  'select',
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'datetime',
  'ordering',
  'matrix',
]);

/** Control family for a raw ATS question type. */
export function controlForQuestionType(questionType: string): PublicQuestionControl {
  return CONTROL_BY_TYPE[questionType] ?? 'unsupported';
}

/**
 * Does this control collect an answer from the candidate?
 *
 * `content` blocks are decoration, and `upload` / `pending` / `unsupported` are
 * intentionally read-only in this beta: sending a made-up payload for them
 * would risk a `VALIDATION_ERROR` (or worse, a meaningless stored answer).
 */
export function controlCollectsAnswer(control: PublicQuestionControl): boolean {
  return ANSWERABLE_CONTROLS.has(control);
}

/** Test/documentation helper: every type the portal knows about. */
export function knownQuestionTypes(): string[] {
  return Object.keys(CONTROL_BY_TYPE);
}

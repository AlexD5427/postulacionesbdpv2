import { z } from 'zod';

/**
 * Validation of the public access form: assessment code + candidate identity.
 *
 * Normalisation is deliberately minimal. The backend stores the document as a
 * plain string and no documented rule lets us rewrite it, so we only trim the
 * ends and collapse repeated inner spaces (both pure typing noise). We do NOT
 * strip hyphens, uppercase letters or reformat anything: a silently rewritten
 * identity document is worse than a rejected one, because the recruiter would
 * never know it happened.
 *
 * The public code IS uppercased, because that is exactly what the backend does
 * before matching (`PublicAssessmentService.gs → evalFindPublishedByCode_`).
 */

/** Collapse runs of whitespace and trim. Never removes other characters. */
export function normalizeSpacing(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** The backend uppercases the code before looking it up; mirroring is safe. */
export function normalizePublicCode(value: string): string {
  return normalizeSpacing(value).toUpperCase();
}

const publicCodeField = z
  .string()
  .transform(normalizePublicCode)
  .refine((value) => value.length >= 3, { message: 'Ingresa el código de la evaluación.' })
  .refine((value) => value.length <= 60, { message: 'El código es demasiado largo.' })
  .refine((value) => /^[A-Z0-9][A-Z0-9-]*$/.test(value), {
    message: 'El código solo puede tener letras, números y guiones (por ejemplo EVL-XXXX-YYYY).',
  });

const fullNameField = z
  .string()
  .transform(normalizeSpacing)
  .refine((value) => value.length >= 3, { message: 'Ingresa tu nombre completo.' })
  .refine((value) => value.length <= 200, { message: 'El nombre es demasiado largo.' })
  .refine((value) => !/\d/.test(value), {
    message: 'El nombre no debe incluir números. El carnet va en el campo siguiente.',
  })
  .refine((value) => value.split(' ').filter(Boolean).length >= 2, {
    message: 'Incluye al menos un nombre y un apellido.',
  });

const documentField = z
  .string()
  .transform(normalizeSpacing)
  .refine((value) => value.length >= 4, { message: 'Ingresa tu número de Carnet de Identidad.' })
  .refine((value) => value.length <= 30, { message: 'El carnet es demasiado largo.' })
  .refine((value) => /^[A-Za-z0-9][A-Za-z0-9\s.-]*$/.test(value), {
    message: 'El carnet solo puede tener números, letras, guiones y puntos.',
  })
  .refine((value) => (value.match(/\d/g) ?? []).length >= 4, {
    message: 'El carnet debe incluir al menos cuatro números.',
  });

export const accessFormSchema = z.object({
  publicCode: publicCodeField,
  fullName: fullNameField,
  document: documentField,
  /**
   * Data-privacy acceptance. Required whenever the assessment asks for it; the
   * form always shows it because the code (and therefore its policy) is only
   * known after the lookup. See `consent.requireDataPrivacyAcceptance`.
   */
  // `boolean().refine(...)` rather than `literal(true)` so the validated output
  // keeps the same shape as the raw form input: react-hook-form can then use a
  // single generic and no cast is needed at the submit boundary.
  acceptPrivacy: z.boolean().refine((accepted) => accepted, {
    message: 'Debes aceptar el tratamiento de tus datos para continuar.',
  }),
});

/** Validated (and normalised) values. Structurally equal to the raw input. */
export type AccessFormValues = z.infer<typeof accessFormSchema>;

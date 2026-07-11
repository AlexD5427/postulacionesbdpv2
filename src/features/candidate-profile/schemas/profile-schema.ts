import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .url('Ingresa una URL válida.')
  .or(z.literal(''))
  .optional();

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresa tu nombre.').max(80),
  lastName: z.string().trim().min(1, 'Ingresa tus apellidos.').max(80),
  headline: z.string().trim().max(120).optional(),
  professionalSummary: z.string().trim().max(1200).optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\s-]*$/, 'Usa solo números y los símbolos + ( ) -')
    .optional(),
  city: z.string().trim().max(80).optional(),
  linkedInUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  availability: z.string().trim().max(120).optional(),
  openToRelocation: z.boolean().default(false),
  preferredAreas: z.array(z.string()).default([]),
  workModes: z.array(z.enum(['on_site', 'hybrid', 'remote'])).default([]),
  employmentTypes: z
    .array(z.enum(['full_time', 'part_time', 'temporary', 'internship', 'consultancy']))
    .default([]),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

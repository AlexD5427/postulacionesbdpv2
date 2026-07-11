import { z } from 'zod';

/**
 * Auth form schemas (client validation for UX; the server remains
 * authoritative). Messages are in Spanish and avoid leaking whether an account
 * exists (generic security errors are handled in the hooks/UI).
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña es demasiado larga.')
  .refine((v) => /[a-zA-Z]/.test(v), 'Incluye al menos una letra.')
  .refine((v) => /[0-9]/.test(v), 'Incluye al menos un número.');

export const loginSchema = z.object({
  email: z.string().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Ingresa tu nombre.').max(80),
    lastName: z.string().min(1, 'Ingresa tus apellidos.').max(80),
    email: z.string().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Debes aceptar los términos de uso.' }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: 'Debes reconocer el aviso de privacidad.' }),
    }),
    acceptDataProcessing: z.literal(true, {
      errorMap: () => ({ message: 'Debes autorizar el tratamiento de tus datos para postular.' }),
    }),
    communicationOptIn: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Simple, transparent password strength heuristic (0–4) for guidance only. */
export function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  const clamped = Math.min(4, score);
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
  return { score: clamped, label: labels[clamped] ?? 'Muy débil' };
}

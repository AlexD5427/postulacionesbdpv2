'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, IdCard, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Field } from '@/design-system/primitives/Field';
import { Input } from '@/design-system/primitives/Input';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Button } from '@/design-system/primitives/Button';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Alert } from '@/shared/components/Alert';
import { accessFormSchema, type AccessFormValues } from '../schemas/access-schema';

interface Props {
  /** Prefilled from `?code=` when present. */
  initialCode?: string;
  /** Hide the code field when it arrived through the link. */
  codeFromLink?: boolean;
  submitting?: boolean;
  /** Candidate-safe error from a previous attempt (never a technical detail). */
  errorMessage?: string;
  onSubmit: (values: AccessFormValues) => void;
}

/**
 * Public entry point: assessment code + identity, with no account.
 *
 * Privacy decisions worth stating out loud:
 *
 *  · The name and the document are held in component state and sent **only** to
 *    the Evaluations backend, in `startAttempt` and `submitAttempt`. They are
 *    never written to the URL, to `localStorage`, or to any log line.
 *  · The form explains *why* the data is requested before asking for it.
 *  · The privacy checkbox is a real gate: `Continuar` stays disabled until the
 *    three fields are valid and the box is ticked.
 */
export function AccessForm({
  initialCode,
  codeFromLink,
  submitting,
  errorMessage,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<AccessFormValues>({
    // The schema also NORMALISES (trim + uppercase), so `handleSubmit` hands over
    // the cleaned values, not what the candidate literally typed.
    resolver: zodResolver(accessFormSchema),
    mode: 'onChange',
    defaultValues: {
      publicCode: initialCode ?? '',
      fullName: '',
      document: '',
      acceptPrivacy: false,
    },
  });

  const acceptPrivacy = watch('acceptPrivacy');

  return (
    <GlassSurface
      variant="elevated"
      radius="3xl"
      padding="lg"
      className="glass-sheen mx-auto flex w-full max-w-xl flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <IdCard className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Rendir una evaluación</h1>
        <p className="text-muted-foreground">
          Ingresa el código que te compartió el equipo de Talento Humano y tus datos para que podamos
          identificar tu intento. No necesitas crear una cuenta.
        </p>
      </div>

      {errorMessage && (
        <Alert tone="warning" title="No pudimos abrir la evaluación">
          {errorMessage}
        </Alert>
      )}

      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={handleSubmit((values) => onSubmit(values))}
      >
        {codeFromLink ? (
          <input type="hidden" {...register('publicCode')} />
        ) : (
          <Field
            label="Código de la evaluación"
            required
            description="Tiene el formato EVL-XXXX-YYYY."
            error={errors.publicCode?.message}
          >
            {(field) => (
              <Input
                {...field}
                {...register('publicCode')}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="EVL-XXXX-YYYY"
                disabled={submitting}
              />
            )}
          </Field>
        )}

        <Field label="Nombre completo" required error={errors.fullName?.message}>
          {(field) => (
            <Input
              {...field}
              {...register('fullName')}
              autoComplete="name"
              placeholder="Nombre y apellidos"
              disabled={submitting}
            />
          )}
        </Field>

        <Field
          label="Carnet de Identidad"
          required
          description="Tal como figura en tu documento. Lo usamos únicamente para vincular tus respuestas con tu postulación."
          error={errors.document?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...register('document')}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ej.: 1234567 LP"
              disabled={submitting}
            />
          )}
        </Field>

        <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
          <Checkbox
            checked={acceptPrivacy}
            disabled={submitting}
            aria-invalid={errors.acceptPrivacy ? true : undefined}
            className="mt-0.5 shrink-0"
            onCheckedChange={(checked) =>
              setValue('acceptPrivacy', checked === true, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          <span className="flex flex-col gap-1">
            <span>
              Acepto que el BDP trate mi nombre, mi Carnet de Identidad y mis respuestas para el
              proceso de selección correspondiente.
            </span>
            <Link
              href="/privacy"
              className="w-fit text-primary underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Leer el aviso de privacidad
            </Link>
          </span>
        </label>
        {errors.acceptPrivacy?.message && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.acceptPrivacy.message}
          </p>
        )}

        <Button type="submit" size="lg" loading={submitting} disabled={!isValid || submitting}>
          Continuar
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Button>
      </form>

      <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" aria-hidden />
          Tus datos viajan cifrados y solo se envían al servicio de evaluaciones del banco.
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
          No usamos cámara, micrófono ni grabación de pantalla en ningún momento.
        </li>
      </ul>
    </GlassSurface>
  );
}

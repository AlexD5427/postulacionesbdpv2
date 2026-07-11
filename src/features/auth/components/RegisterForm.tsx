'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerSchema, type RegisterValues } from '../schemas/auth-schemas';
import { useRegister } from '../hooks/use-auth';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { Field } from '@/design-system/primitives/Field';
import { Input } from '@/design-system/primitives/Input';
import { PasswordInput } from '@/design-system/primitives/PasswordInput';
import { Button } from '@/design-system/primitives/Button';
import { Checkbox } from '@/design-system/primitives/Checkbox';
import { Alert } from '@/shared/components/Alert';

function ConsentRow({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          aria-invalid={error ? true : undefined}
          className="mt-0.5"
        />
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {children}
        </label>
      </div>
      {error && (
        <p role="alert" className="pl-8 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { communicationOptIn: false },
  });
  const password = watch('password') ?? '';

  async function onSubmit(values: RegisterValues) {
    try {
      await registerMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        acceptTerms: values.acceptTerms,
        acceptPrivacy: values.acceptPrivacy,
        acceptDataProcessing: values.acceptDataProcessing,
        communicationOptIn: values.communicationOptIn,
      });
      router.push('/candidate');
    } catch {
      // Generic error below.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {registerMutation.isError && (
        <Alert tone="danger" title="No pudimos crear tu cuenta">
          Inténtalo de nuevo. Si ya tienes una cuenta con este correo, intenta iniciar sesión o
          recuperar tu contraseña.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" required error={errors.firstName?.message}>
          {(field) => <Input {...field} {...register('firstName')} autoComplete="given-name" />}
        </Field>
        <Field label="Apellidos" required error={errors.lastName?.message}>
          {(field) => <Input {...field} {...register('lastName')} autoComplete="family-name" />}
        </Field>
      </div>

      <Field label="Correo electrónico" required error={errors.email?.message}>
        {(field) => (
          <Input {...field} {...register('email')} type="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" />
        )}
      </Field>

      <Field
        label="Contraseña"
        required
        error={errors.password?.message}
        description="Al menos 8 caracteres, con letras y números."
      >
        {(field) => <PasswordInput {...field} {...register('password')} autoComplete="new-password" />}
      </Field>
      <PasswordStrengthMeter password={password} />

      <Field label="Confirmar contraseña" required error={errors.confirmPassword?.message}>
        {(field) => <PasswordInput {...field} {...register('confirmPassword')} autoComplete="new-password" />}
      </Field>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => (
            <ConsentRow id="acceptTerms" checked={!!field.value} onChange={field.onChange} error={errors.acceptTerms?.message}>
              He leído y acepto los{' '}
              <Link href="/terms" className="font-medium text-primary underline underline-offset-4" target="_blank">
                términos de uso
              </Link>
              .
            </ConsentRow>
          )}
        />
        <Controller
          control={control}
          name="acceptPrivacy"
          render={({ field }) => (
            <ConsentRow id="acceptPrivacy" checked={!!field.value} onChange={field.onChange} error={errors.acceptPrivacy?.message}>
              Reconozco el{' '}
              <Link href="/privacy" className="font-medium text-primary underline underline-offset-4" target="_blank">
                aviso de privacidad
              </Link>
              .
            </ConsentRow>
          )}
        />
        <Controller
          control={control}
          name="acceptDataProcessing"
          render={({ field }) => (
            <ConsentRow
              id="acceptDataProcessing"
              checked={!!field.value}
              onChange={field.onChange}
              error={errors.acceptDataProcessing?.message}
            >
              Autorizo el tratamiento de mis datos personales para gestionar mis postulaciones.
            </ConsentRow>
          )}
        />
        <Controller
          control={control}
          name="communicationOptIn"
          render={({ field }) => (
            <ConsentRow id="communicationOptIn" checked={!!field.value} onChange={field.onChange}>
              (Opcional) Deseo recibir comunicaciones sobre nuevas convocatorias.
            </ConsentRow>
          )}
        />
      </div>

      <Button type="submit" loading={isSubmitting || registerMutation.isPending} className="w-full">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Ingresar
        </Link>
      </p>
    </form>
  );
}

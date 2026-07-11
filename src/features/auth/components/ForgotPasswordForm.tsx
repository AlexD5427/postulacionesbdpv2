'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/auth-schemas';
import { useRequestPasswordReset } from '../hooks/use-auth';
import { Field } from '@/design-system/primitives/Field';
import { Input } from '@/design-system/primitives/Input';
import { Button } from '@/design-system/primitives/Button';
import { Alert } from '@/shared/components/Alert';

export function ForgotPasswordForm() {
  const request = useRequestPasswordReset();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    // Always resolves the same way — never reveal whether the email exists.
    await request.mutateAsync(values.email).catch(() => {});
  }

  if (request.isSuccess) {
    return (
      <Alert tone="success" title="Revisa tu correo">
        Si existe una cuenta asociada a ese correo, te enviamos instrucciones para restablecer tu
        contraseña.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">
        Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
      </p>
      <Field label="Correo electrónico" required error={errors.email?.message}>
        {(field) => <Input {...field} {...register('email')} type="email" autoComplete="email" />}
      </Field>
      <Button type="submit" loading={isSubmitting || request.isPending} className="w-full">
        Enviar instrucciones
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

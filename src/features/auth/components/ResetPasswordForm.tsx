'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas/auth-schemas';
import { useResetPassword } from '../hooks/use-auth';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { Field } from '@/design-system/primitives/Field';
import { PasswordInput } from '@/design-system/primitives/PasswordInput';
import { Button } from '@/design-system/primitives/Button';
import { Alert } from '@/shared/components/Alert';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });
  const password = watch('password') ?? '';

  async function onSubmit(values: ResetPasswordValues) {
    try {
      await reset.mutateAsync({ token, password: values.password });
      setTimeout(() => router.push('/login'), 1500);
    } catch {
      // Generic error below.
    }
  }

  if (reset.isSuccess) {
    return (
      <Alert tone="success" title="Contraseña actualizada">
        Tu contraseña fue restablecida. Te llevaremos a iniciar sesión…
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {reset.isError && (
        <Alert tone="danger" title="No pudimos restablecer tu contraseña">
          El enlace puede haber expirado. Solicita uno nuevo.
        </Alert>
      )}
      {!token && (
        <Alert tone="warning" title="Enlace inválido">
          Falta el código de restablecimiento. Solicita un nuevo enlace.
        </Alert>
      )}
      <Field label="Nueva contraseña" required error={errors.password?.message}>
        {(field) => <PasswordInput {...field} {...register('password')} autoComplete="new-password" />}
      </Field>
      <PasswordStrengthMeter password={password} />
      <Field label="Confirmar contraseña" required error={errors.confirmPassword?.message}>
        {(field) => <PasswordInput {...field} {...register('confirmPassword')} autoComplete="new-password" />}
      </Field>
      <Button type="submit" loading={isSubmitting || reset.isPending} disabled={!token} className="w-full">
        Restablecer contraseña
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

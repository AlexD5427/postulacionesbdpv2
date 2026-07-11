'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginValues } from '../schemas/auth-schemas';
import { useLogin } from '../hooks/use-auth';
import { Field } from '@/design-system/primitives/Field';
import { Input } from '@/design-system/primitives/Input';
import { PasswordInput } from '@/design-system/primitives/PasswordInput';
import { Button } from '@/design-system/primitives/Button';
import { Alert } from '@/shared/components/Alert';

export function LoginForm({ returnTo = '/candidate' }: { returnTo?: string }) {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    try {
      await login.mutateAsync(values);
      router.push(returnTo);
    } catch {
      // Generic message — never reveal whether the account exists.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {login.isError && (
        <Alert tone="danger" title="No pudimos iniciar sesión">
          Verifica tu correo y contraseña e inténtalo de nuevo.
        </Alert>
      )}

      <Field label="Correo electrónico" required error={errors.email?.message}>
        {(field) => (
          <Input {...field} {...register('email')} type="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" />
        )}
      </Field>

      <Field label="Contraseña" required error={errors.password?.message}>
        {(field) => (
          <PasswordInput {...field} {...register('password')} autoComplete="current-password" />
        )}
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button type="submit" loading={isSubmitting || login.isPending} className="w-full">
        Ingresar
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}

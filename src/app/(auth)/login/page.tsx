import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo && returnTo.startsWith('/') ? returnTo : '/candidate';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">Bienvenid@ de nuevo</h1>
        <p className="text-sm text-muted-foreground">Ingresa para gestionar tus postulaciones.</p>
      </div>
      <LoginForm returnTo={safeReturn} />
    </div>
  );
}

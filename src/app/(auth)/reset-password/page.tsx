import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export const metadata: Metadata = { title: 'Restablecer contraseña' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
        <p className="text-sm text-muted-foreground">Define una nueva contraseña para tu cuenta.</p>
      </div>
      <ResetPasswordForm token={token ?? ''} />
    </div>
  );
}

import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

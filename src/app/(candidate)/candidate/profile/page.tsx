import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { ProfileEditor } from '@/features/candidate-profile/components/ProfileEditor';
import { AccountPrivacyControls } from '@/features/candidate-profile/components/AccountPrivacyControls';

export const metadata: Metadata = { title: 'Mi perfil' };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Mi perfil" description="Mantén tu información actualizada para agilizar tus postulaciones." />
      <ProfileEditor />
      <div className="border-t border-border pt-8">
        <h2 className="mb-4 text-2xl font-bold">Privacidad y cuenta</h2>
        <AccountPrivacyControls />
      </div>
    </div>
  );
}

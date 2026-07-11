import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { SettingsView } from '@/features/candidate-profile/components/SettingsView';

export const metadata: Metadata = { title: 'Ajustes' };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ajustes" description="Gestiona tu cuenta, apariencia, notificaciones y accesibilidad." />
      <SettingsView />
    </div>
  );
}

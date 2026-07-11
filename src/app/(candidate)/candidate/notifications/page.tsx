import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { NotificationsView } from '@/features/notifications/components/NotificationsView';

export const metadata: Metadata = { title: 'Notificaciones' };

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Notificaciones" description="Comunicaciones del banco relacionadas con tu cuenta y tus postulaciones." />
      <NotificationsView />
    </div>
  );
}

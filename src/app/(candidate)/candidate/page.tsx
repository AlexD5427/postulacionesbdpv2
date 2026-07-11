import type { Metadata } from 'next';
import { DashboardView } from '@/features/candidate-profile/components/DashboardView';

export const metadata: Metadata = { title: 'Mi espacio' };

export default function CandidateDashboardPage() {
  return <DashboardView />;
}

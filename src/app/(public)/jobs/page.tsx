import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { JobsDirectory } from '@/features/jobs/components/JobsDirectory';
import { RecentlyViewedJobs } from '@/features/jobs/components/RecentlyViewedJobs';

export const metadata: Metadata = {
  title: 'Convocatorias',
  description: 'Explora las convocatorias abiertas del Banco de Desarrollo Productivo BDP S.A.M.',
};

export default function JobsPage() {
  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader
        eyebrow="Oportunidades"
        title="Convocatorias abiertas"
        description="Encuentra la posición que se ajusta a tu experiencia e intereses. Postular es gratuito."
      />
      <RecentlyViewedJobs />
      <JobsDirectory />
    </div>
  );
}


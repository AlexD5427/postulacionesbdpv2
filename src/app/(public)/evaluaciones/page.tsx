import type { Metadata } from 'next';
import { PublicAssessmentFlow } from '@/features/public-assessments/components/PublicAssessmentFlow';

/**
 * Public assessment route — **temporary beta module**.
 *
 * No auth guard, no session, no cookie: a candidate arrives with a link
 * (`/evaluaciones?code=EVL-XXXX-YYYY`) or types the code here. The page itself is
 * a thin Server Component: it only reads the code from the query string and
 * hands it to the client flow, so the route stays statically renderable and the
 * authenticated assessment engine under `(candidate)` is untouched.
 */
export const metadata: Metadata = {
  title: 'Rendir una evaluación',
  description:
    'Ingresa el código de tu evaluación y tus datos para responderla. No necesitas crear una cuenta.',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function PublicAssessmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Accepts `?code=` and the shorter `?c=` used in some printed links.
  const code = firstValue(params.code) ?? firstValue(params.c);

  return (
    <div className="container-page py-10 md:py-16">
      <PublicAssessmentFlow initialCode={code?.trim() || undefined} />
    </div>
  );
}

import type { Metadata } from 'next';
import { PublicAssessmentFlow } from '@/features/public-assessments/components/PublicAssessmentFlow';
import '@/features/public-assessments/assessment.css';

/**
 * Ruta pública de evaluaciones — **módulo temporal, sin inicio de sesión**.
 *
 * Sin guard de sesión, sin cookie, sin correo: un candidato llega con el enlace de
 * su invitación (`/evaluaciones?codigo=EV-XXXX-1234`) y se identifica con su número
 * identificador. La página es un Server Component mínimo —lee el código de la
 * cadena de consulta y lo entrega al flujo— para que la ruta siga siendo estática y
 * el motor autenticado de `(candidate)/candidate/assessments` quede intacto.
 *
 * `robots: noindex` porque una evaluación se distribuye por enlace directo y no
 * tiene ningún sentido en un buscador.
 *
 * Cómo retirar el módulo cuando llegue el acceso con Google: ver
 * `src/features/public-assessments/README.md`.
 */
export const metadata: Metadata = {
  title: 'Rendir una evaluación',
  description:
    'Identifícate con tu número identificador para rendir la evaluación de tu proceso de selección. No necesitas crear una cuenta.',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PublicAssessmentsPage({ searchParams }: PageProps) {
  const parametros = await searchParams;
  /**
   * Tres nombres para el mismo parámetro.
   *
   * `codigo` es el que usa el ATS al generar el enlace público; `code` y `c` se
   * aceptan porque enlaces impresos y correos antiguos los usan, y rechazarlos
   * obligaría al candidato a teclear el código a mano por una letra.
   */
  const codigo =
    primerValor(parametros.codigo) ?? primerValor(parametros.code) ?? primerValor(parametros.c);

  return (
    <div className="container-page py-10 md:py-16">
      <PublicAssessmentFlow codigoInicial={codigo?.trim() || undefined} />
    </div>
  );
}

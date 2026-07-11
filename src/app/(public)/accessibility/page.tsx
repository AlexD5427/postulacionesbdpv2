import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { AccessibilityPanel } from '@/features/accessibility/components/AccessibilityPanel';

export const metadata: Metadata = {
  title: 'Accesibilidad',
  description:
    'Nuestro compromiso con la accesibilidad y las herramientas para adaptar el portal a tus necesidades.',
};

export default function AccessibilityPage() {
  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader
        eyebrow="Compromiso"
        title="Accesibilidad"
        description="Trabajamos para que cualquier persona pueda postular en igualdad de condiciones. Aspiramos a cumplir las pautas WCAG 2.2 AA e incorporamos mejoras adicionales, especialmente en el control del movimiento."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <GlassSurface variant="standard" radius="3xl" padding="lg" className="prose-bdp flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Qué encontrarás en este portal</h2>
            <ul className="flex flex-col gap-2 text-muted-foreground">
              <li>• Navegación completa por teclado y foco visible en todo momento.</li>
              <li>• Estructura semántica, regiones y encabezados lógicos.</li>
              <li>• Contraste suficiente y estados que no dependen solo del color.</li>
              <li>• Texto ampliable hasta 200% sin desplazamiento horizontal.</li>
              <li>• Alternativas estáticas para todas las animaciones importantes.</li>
              <li>• Subtítulos y transcripciones para el contenido de video con voz.</li>
              <li>• Controles de accesibilidad disponibles en cada página.</li>
            </ul>
          </GlassSurface>

          <GlassSurface variant="standard" radius="3xl" padding="lg" className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">¿Necesitas una adaptación?</h2>
            <p className="text-muted-foreground">
              Si requieres una adaptación para completar tu postulación o una evaluación, escríbenos a{' '}
              <a className="font-medium text-primary underline underline-offset-4" href="mailto:accesibilidad@bdp.com.bo">
                accesibilidad@bdp.com.bo
              </a>
              . Solicitar una adaptación no afecta de ninguna manera tu postulación.
            </p>
          </GlassSurface>
        </div>

        <GlassSurface variant="elevated" radius="3xl" padding="lg" className="h-fit">
          <h2 className="mb-4 text-xl font-semibold">Personaliza tu experiencia</h2>
          <AccessibilityPanel />
        </GlassSurface>
      </div>
    </div>
  );
}

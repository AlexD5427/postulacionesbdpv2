import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/shared/components/PageHeader';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/design-system/primitives/Accordion';
import { Button } from '@/design-system/primitives/Button';
import { appConfig } from '@/core/config/app-config';

export const metadata: Metadata = {
  title: 'Centro de ayuda',
  description: 'Preguntas frecuentes y canales de soporte para postulantes del BDP.',
};

const FAQ = [
  {
    q: '¿Cómo creo una cuenta?',
    a: 'Haz clic en "Crear cuenta", ingresa tu nombre y correo, y define una contraseña. Recibirás un correo de verificación.',
  },
  {
    q: '¿Tiene costo postular?',
    a: 'No. Postular es completamente gratuito. El banco nunca te pedirá pagos para participar en un proceso.',
  },
  {
    q: '¿Cómo sé en qué etapa está mi postulación?',
    a: 'El portal te muestra si tu postulación fue enviada y su número de confirmación. El banco se comunicará contigo directamente cuando corresponda; no mostramos etapas internas del proceso.',
  },
  {
    q: '¿Qué información se registra durante una evaluación?',
    a: 'Solo información técnica limitada para integridad y soporte (tiempos, interrupciones de conexión, si la página se oculta). No usamos cámara, micrófono ni grabación de pantalla. Verás una explicación clara antes de comenzar.',
  },
  {
    q: '¿Puedo solicitar una adaptación?',
    a: 'Sí. Escríbenos a accesibilidad@bdp.com.bo. Solicitar una adaptación no afecta tu postulación.',
  },
];

export default function HelpPage() {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-10">
      <PageHeader
        eyebrow="Soporte"
        title="Centro de ayuda"
        description="Encuentra respuestas a las preguntas más comunes o contáctanos directamente."
      />

      <GlassSurface variant="standard" radius="3xl" padding="lg">
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </GlassSurface>

      <GlassSurface variant="elevated" radius="3xl" padding="lg" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">¿No encontraste lo que buscabas?</h2>
        <p className="text-muted-foreground">
          Escríbenos a{' '}
          <a className="font-medium text-primary underline underline-offset-4" href={`mailto:${appConfig.organization.supportEmail}`}>
            {appConfig.organization.supportEmail}
          </a>{' '}
          o llámanos al {appConfig.organization.supportPhone}.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/jobs">Ver convocatorias</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/accessibility">Accesibilidad</Link>
          </Button>
        </div>
      </GlassSurface>
    </div>
  );
}

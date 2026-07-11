import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { LegalSection } from '@/shared/components/LegalSection';
import { Badge } from '@/design-system/primitives/Badge';
import { appConfig } from '@/core/config/app-config';

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description: 'Cómo tratamos tus datos personales en el portal de talento del BDP.',
};

export default function PrivacyPage() {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-10">
      <PageHeader eyebrow="Legal" title="Aviso de privacidad" description={`Versión ${appConfig.legal.privacyVersion}.`} />
      <Badge tone="warning" className="w-fit">
        Borrador sujeto a revisión legal y de privacidad del banco
      </Badge>

      <LegalSection title="Qué información recopilamos">
        <p>
          Recopilamos únicamente la información necesaria para gestionar tu postulación: datos de
          cuenta (nombre, correo), la información de perfil y CV que decidas proporcionar, y los
          datos de las convocatorias a las que postulas.
        </p>
      </LegalSection>

      <LegalSection title="Para qué la usamos">
        <p>
          Utilizamos tus datos para procesar tus postulaciones, comunicarnos contigo cuando
          corresponda y mejorar la experiencia del portal. No vendemos tu información.
        </p>
      </LegalSection>

      <LegalSection title="Evaluaciones e integridad">
        <p>
          Durante una evaluación podemos registrar información técnica limitada (tiempos, cambios de
          visibilidad de la página, interrupciones de conexión) con fines de integridad y soporte.
          Esta información, por sí sola, no determina el resultado de tu postulación y se conserva de
          forma separada de tus respuestas. No activamos tu cámara ni tu micrófono, y no grabamos tu
          pantalla.
        </p>
      </LegalSection>

      <LegalSection title="Tus derechos">
        <p>
          Puedes solicitar el acceso, la exportación o la eliminación de tus datos desde la sección
          de ajustes de tu cuenta, o escribiéndonos a {appConfig.organization.supportEmail}.
        </p>
      </LegalSection>

      <LegalSection title="Decisiones automatizadas">
        <p>
          No tomamos decisiones de empleo de forma totalmente automatizada. Cualquier decisión que
          pudiera afectarte está sujeta a revisión humana autorizada, a las políticas de la
          organización y a la legislación aplicable.
        </p>
      </LegalSection>
    </div>
  );
}

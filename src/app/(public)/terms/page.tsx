import type { Metadata } from 'next';
import { PageHeader } from '@/shared/components/PageHeader';
import { LegalSection } from '@/shared/components/LegalSection';
import { Badge } from '@/design-system/primitives/Badge';
import { appConfig } from '@/core/config/app-config';

export const metadata: Metadata = {
  title: 'Términos de uso',
  description: 'Términos de uso del portal de talento del BDP.',
};

export default function TermsPage() {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-10">
      <PageHeader eyebrow="Legal" title="Términos de uso" description={`Versión ${appConfig.legal.termsVersion}.`} />
      <Badge tone="warning" className="w-fit">
        Borrador sujeto a revisión legal del banco
      </Badge>

      <LegalSection title="Uso del portal">
        <p>
          Este portal permite a personas candidatas explorar convocatorias y postular a procesos de
          selección del {appConfig.organization.legalName}. El uso del portal es gratuito.
        </p>
      </LegalSection>
      <LegalSection title="Veracidad de la información">
        <p>
          Te comprometes a proporcionar información veraz y actualizada. La información falsa puede
          afectar tu participación en los procesos de selección.
        </p>
      </LegalSection>
      <LegalSection title="Seguridad de tu cuenta">
        <p>
          Eres responsable de mantener la confidencialidad de tus credenciales. El banco nunca te
          pedirá tu contraseña ni pagos para postular.
        </p>
      </LegalSection>
      <LegalSection title="Contacto">
        <p>Ante cualquier duda, escríbenos a {appConfig.organization.supportEmail}.</p>
      </LegalSection>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, KeyRound, ShieldAlert, History } from 'lucide-react';
import { useRequestAccountDeletion, useRequestDataExport } from '../hooks/use-profile';
import { useAccount } from '../hooks/use-profile';
import { Card, CardTitle, CardDescription } from '@/design-system/primitives/Card';
import { Button } from '@/design-system/primitives/Button';
import { Alert } from '@/shared/components/Alert';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/design-system/primitives/Dialog';
import { appConfig } from '@/core/config/app-config';
import { formatLongDate } from '@/shared/utils/dates';

export function AccountPrivacyControls() {
  const { data: account } = useAccount();
  const exportReq = useRequestDataExport();
  const deletion = useRequestAccountDeletion();
  const [deletionRequested, setDeletionRequested] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden />
          Contraseña
        </CardTitle>
        <CardDescription>Gestiona la contraseña de tu cuenta.</CardDescription>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/forgot-password">Cambiar contraseña</Link>
        </Button>
      </Card>

      <Card className="gap-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" aria-hidden />
          Historial de consentimientos
        </CardTitle>
        <CardDescription>Registro de las autorizaciones asociadas a tu cuenta.</CardDescription>
        <ul className="flex flex-col divide-y divide-border text-sm">
          <li className="flex justify-between py-2">
            <span>Tratamiento de datos para postulaciones</span>
            <span className="text-muted-foreground">
              {account?.dataProcessingConsentAt ? formatLongDate(account.dataProcessingConsentAt) : '—'}
            </span>
          </li>
          <li className="flex justify-between py-2">
            <span>Comunicaciones de nuevas convocatorias</span>
            <span className="text-muted-foreground">
              {account?.communicationOptIn ? 'Aceptado' : 'No aceptado'}
            </span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Historial de ejemplo para el MVP. La versión final se integrará con el registro de
          consentimientos del banco.
        </p>
      </Card>

      <Card className="gap-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="h-5 w-5 text-primary" aria-hidden />
          Exportar mis datos
        </CardTitle>
        <CardDescription>Solicita una copia de la información asociada a tu cuenta.</CardDescription>
        {exportReq.isSuccess ? (
          <Alert tone="success" title="Solicitud recibida">
            Procesaremos tu solicitud de exportación (referencia {exportReq.data?.requestId.slice(0, 8)}). Te
            contactaremos a tu correo.
          </Alert>
        ) : (
          <Button variant="outline" className="w-fit" onClick={() => exportReq.mutate()} loading={exportReq.isPending}>
            Solicitar exportación
          </Button>
        )}
      </Card>

      <Card className="gap-4 border border-danger/30">
        <CardTitle className="flex items-center gap-2 text-lg text-danger">
          <ShieldAlert className="h-5 w-5" aria-hidden />
          Eliminar mi cuenta
        </CardTitle>
        <CardDescription>
          Solicita la eliminación de tu cuenta y tus datos. Esta acción está sujeta a revisión y a los
          plazos legales aplicables.
        </CardDescription>
        {deletionRequested ? (
          <Alert tone="success" title="Solicitud registrada">
            Registramos tu solicitud de eliminación. El equipo del banco la revisará y te contactará a{' '}
            {account?.identity.email}.
          </Alert>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger" className="w-fit">
                Solicitar eliminación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="text-xl font-semibold">¿Eliminar tu cuenta?</DialogTitle>
              <DialogDescription className="mt-2 text-muted-foreground">
                Esta acción solicitará la eliminación de tu cuenta y tus postulaciones. Podrás
                contactar a {appConfig.organization.supportEmail} si cambias de opinión.
              </DialogDescription>
              <div className="mt-6 flex justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="danger"
                    loading={deletion.isPending}
                    onClick={async () => {
                      await deletion.mutateAsync().catch(() => {});
                      setDeletionRequested(true);
                    }}
                  >
                    Sí, solicitar eliminación
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Card>
    </div>
  );
}

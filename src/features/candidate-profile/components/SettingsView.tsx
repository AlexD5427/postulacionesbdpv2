'use client';

import { MailCheck, MailWarning } from 'lucide-react';
import { useAccount } from '@/features/candidate-profile/hooks/use-profile';
import { useLogout } from '@/features/auth/hooks/use-auth';
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from '@/features/notifications/hooks/use-notifications';
import { NOTIFICATION_CATEGORY_LABELS } from '@/features/notifications/lib/labels';
import { Card, CardTitle, CardDescription } from '@/design-system/primitives/Card';
import { Button } from '@/design-system/primitives/Button';
import { Switch } from '@/design-system/primitives/Switch';
import { Badge } from '@/design-system/primitives/Badge';
import { ThemeToggle } from '@/design-system/themes/ThemeToggle';
import { AccessibilityPanel } from '@/features/accessibility/components/AccessibilityPanel';
import type { NotificationCategory } from '@/shared/types/domain';

export function SettingsView() {
  const { data: account } = useAccount();
  const logout = useLogout();
  const { data: prefs } = useNotificationPreferences();
  const savePrefs = useSaveNotificationPreferences();

  function toggleCategory(category: NotificationCategory, value: boolean) {
    if (!prefs) return;
    savePrefs.mutate({ ...prefs, categories: { ...prefs.categories, [category]: value } });
  }
  function toggleChannel(channel: 'email' | 'inApp', value: boolean) {
    if (!prefs) return;
    savePrefs.mutate({ ...prefs, channels: { ...prefs.channels, [channel]: value } });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardTitle className="text-lg">Cuenta</CardTitle>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{account?.identity.email}</p>
            <p className="text-sm text-muted-foreground">{account?.identity.displayName}</p>
          </div>
          {account?.identity.emailVerified ? (
            <Badge tone="success">
              <MailCheck className="h-3.5 w-3.5" aria-hidden />
              Correo verificado
            </Badge>
          ) : (
            <Badge tone="warning">
              <MailWarning className="h-3.5 w-3.5" aria-hidden />
              Correo sin verificar
            </Badge>
          )}
        </div>
        <Button variant="outline" className="w-fit" onClick={() => logout.mutate()} loading={logout.isPending}>
          Cerrar sesión
        </Button>
      </Card>

      <Card className="gap-4">
        <CardTitle className="text-lg">Apariencia</CardTitle>
        <CardDescription>Elige el tema de color. Puedes ajustar más opciones abajo.</CardDescription>
        <ThemeToggle />
      </Card>

      <Card className="gap-4">
        <CardTitle className="text-lg">Preferencias de notificaciones</CardTitle>
        <CardDescription>Elige cómo y sobre qué quieres recibir avisos.</CardDescription>
        {prefs && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Canales</span>
              <div className="flex items-center justify-between">
                <label htmlFor="ch-email" className="text-sm text-muted-foreground">Correo electrónico</label>
                <Switch id="ch-email" checked={prefs.channels.email} onCheckedChange={(v) => toggleChannel('email', v)} />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="ch-inapp" className="text-sm text-muted-foreground">En la plataforma</label>
                <Switch id="ch-inapp" checked={prefs.channels.inApp} onCheckedChange={(v) => toggleChannel('inApp', v)} />
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <span className="text-sm font-medium">Categorías</span>
              {(Object.keys(prefs.categories) as NotificationCategory[]).map((category) => (
                <div key={category} className="flex items-center justify-between">
                  <label htmlFor={`cat-${category}`} className="text-sm text-muted-foreground">
                    {NOTIFICATION_CATEGORY_LABELS[category]}
                  </label>
                  <Switch
                    id={`cat-${category}`}
                    checked={prefs.categories[category]}
                    onCheckedChange={(v) => toggleCategory(category, v)}
                    disabled={category === 'security' || category === 'account'}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Los avisos de seguridad y de cuenta no pueden desactivarse.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card className="gap-4">
        <CardTitle className="text-lg">Accesibilidad</CardTitle>
        <CardDescription>Estas preferencias se guardan en este dispositivo.</CardDescription>
        <AccessibilityPanel />
      </Card>
    </div>
  );
}

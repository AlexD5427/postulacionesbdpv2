'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck } from 'lucide-react';
import type { NotificationCategory } from '@/shared/types/domain';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '../hooks/use-notifications';
import { NOTIFICATION_CATEGORY_LABELS } from '../lib/labels';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/utils/dates';

export function NotificationsView() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all');

  const list = (notifications ?? []).filter((n) => filter === 'all' || n.category === filter);
  const unread = (notifications ?? []).filter((n) => !n.read).length;
  const categories = [...new Set((notifications ?? []).map((n) => n.category))];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium',
              filter === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={filter === cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm font-medium',
                filter === cat ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {NOTIFICATION_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={unread === 0}>
          <CheckCheck className="h-4 w-4" aria-hidden />
          Marcar todas como leídas
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : list.length === 0 ? (
        <GlassSurface variant="standard" radius="3xl" padding="lg" className="flex flex-col items-center gap-2 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">No tienes notificaciones en esta categoría.</p>
        </GlassSurface>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((n) => (
            <li key={n.id}>
              <GlassSurface
                variant={n.read ? 'subtle' : 'standard'}
                radius="2xl"
                padding="md"
                className={cn('flex items-start gap-3', !n.read && 'border-primary/30')}
              >
                {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    <Badge tone="neutral">{NOTIFICATION_CATEGORY_LABELS[n.category]}</Badge>
                    {n.actionRequired && <Badge tone="warning">Acción requerida</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</span>
                    {n.link && (
                      <Link href={n.link} className="text-sm font-medium text-primary underline underline-offset-4">
                        Ver detalle
                      </Link>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="icon" aria-label="Marcar como leída" onClick={() => markRead.mutate(n.id)}>
                    <Check className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </GlassSurface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

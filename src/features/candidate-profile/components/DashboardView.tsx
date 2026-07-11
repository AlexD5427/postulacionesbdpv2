'use client';

import Link from 'next/link';
import {
  ArrowRight,
  User,
  FileText,
  Send,
  ClipboardCheck,
  Bell,
  Bookmark,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useAccount, useProfile } from '../hooks/use-profile';
import { useCV } from '@/features/cv/hooks/use-cv';
import { useCoverLetters } from '@/features/cv/hooks/use-cover-letters';
import { useApplications } from '@/features/applications/hooks/use-applications';
import { useAssessmentInvitations } from '@/features/assessments/hooks/use-assessments';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useSavedJobsStore } from '@/features/jobs/state/saved-jobs-store';
import { computeCVCompletion, computeProfileCompletion } from '../lib/completion';
import { Card, CardTitle, CardDescription } from '@/design-system/primitives/Card';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Progress } from '@/design-system/primitives/Progress';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { formatRelative } from '@/shared/utils/dates';

function StatCard({
  icon: Icon,
  value,
  label,
  href,
}: {
  icon: typeof User;
  value: number;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <GlassSurface variant="subtle" radius="2xl" padding="md" className="h-full transition-shadow hover:shadow-glass-md">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </GlassSurface>
    </Link>
  );
}

export function DashboardView() {
  const { data: account, isLoading: loadingAccount } = useAccount();
  const { data: profile } = useProfile();
  const { data: cv } = useCV();
  const { data: coverLetters } = useCoverLetters();
  const { data: applications } = useApplications();
  const { data: invitations } = useAssessmentInvitations();
  const { data: notifications } = useNotifications();
  const savedCount = useSavedJobsStore((s) => s.saved.length);

  const profileCompletion = computeProfileCompletion(profile ?? null);
  const cvCompletion = computeCVCompletion(cv ?? null);
  const drafts = (applications ?? []).filter((a) => a.lifecycle === 'draft').length;
  const submitted = (applications ?? []).filter((a) => a.lifecycle === 'submitted').length;
  const pendingAssessments = (invitations ?? []).filter((i) => i.status === 'pending' || i.status === 'in_progress').length;
  const unread = (notifications ?? []).filter((n) => !n.read).length;

  // Recommended next action — derived ONLY from incomplete account/profile
  // tasks, never from job fit.
  const nextAction =
    profileCompletion < 100
      ? { label: 'Completa tu perfil', href: '/candidate/profile', desc: 'Un perfil completo agiliza tus postulaciones.' }
      : cvCompletion < 100
        ? { label: 'Completa tu CV digital', href: '/candidate/cv', desc: 'Añade tu experiencia y formación.' }
        : account && !account.identity.emailVerified
          ? { label: 'Verifica tu correo', href: '/candidate/settings', desc: 'Confirma tu correo para asegurar tu cuenta.' }
          : { label: 'Explora convocatorias', href: '/jobs', desc: 'Encuentra tu próxima oportunidad.' };

  const recentApplications = (applications ?? []).slice(0, 3);
  const recentNotifications = (notifications ?? []).slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        {loadingAccount ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <h1 className="text-3xl font-bold">
            Hola, {account?.identity.displayName?.split(' ')[0] ?? 'candidat@'} 👋
          </h1>
        )}
        <p className="text-muted-foreground">Este es tu espacio para gestionar tus postulaciones.</p>
      </header>

      {/* Next action */}
      <GlassSurface variant="elevated" radius="3xl" padding="lg" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Siguiente paso sugerido</p>
            <p className="text-lg font-semibold">{nextAction.label}</p>
            <p className="text-sm text-muted-foreground">{nextAction.desc}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={nextAction.href}>
            Continuar
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </GlassSurface>

      {/* Completion */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" aria-hidden />
              Perfil
            </CardTitle>
            <span className="text-sm font-semibold tabular-nums">{profileCompletion}%</span>
          </div>
          <Progress value={profileCompletion} label="Progreso del perfil" />
          <CardDescription>Completa tu información profesional y preferencias.</CardDescription>
          <Button asChild variant="ghost" size="sm" className="mt-1 w-fit">
            <Link href="/candidate/profile">Editar perfil</Link>
          </Button>
        </Card>

        <Card className="gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" aria-hidden />
              CV digital
            </CardTitle>
            <span className="text-sm font-semibold tabular-nums">{cvCompletion}%</span>
          </div>
          <Progress value={cvCompletion} label="Progreso del CV" />
          <CardDescription>Tu experiencia, formación y habilidades en un solo lugar.</CardDescription>
          <Button asChild variant="ghost" size="sm" className="mt-1 w-fit">
            <Link href="/candidate/cv">Editar CV</Link>
          </Button>
        </Card>
      </div>

      {/* Stats */}
      <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Send} value={submitted} label="Postulaciones enviadas" href="/candidate/applications" />
        <StatCard icon={FileText} value={drafts} label="Borradores" href="/candidate/applications" />
        <StatCard icon={ClipboardCheck} value={pendingAssessments} label="Evaluaciones asignadas" href="/candidate/assessments" />
        <StatCard icon={Bell} value={unread} label="Notificaciones sin leer" href="/candidate/notifications" />
        <StatCard icon={Bookmark} value={savedCount} label="Convocatorias guardadas" href="/jobs" />
        <StatCard icon={Mail} value={coverLetters?.length ?? 0} label="Cartas de presentación" href="/candidate/cover-letters" />
      </section>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4">
          <CardTitle className="text-lg">Postulaciones recientes</CardTitle>
          {recentApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no tienes postulaciones.{' '}
              <Link href="/jobs" className="font-medium text-primary underline underline-offset-4">
                Explora convocatorias
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentApplications.map((app) => (
                <li key={app.meta.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/candidate/applications/${app.meta.id}`} className="truncate font-medium hover:text-primary">
                      {app.jobTitle}
                    </Link>
                    <p className="text-xs text-muted-foreground">{app.jobReference}</p>
                  </div>
                  <Badge tone={app.lifecycle === 'submitted' ? 'success' : app.lifecycle === 'withdrawn' ? 'neutral' : 'warning'}>
                    {app.lifecycle === 'submitted' ? 'Enviada' : app.lifecycle === 'withdrawn' ? 'Retirada' : 'Borrador'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4">
          <CardTitle className="text-lg">Notificaciones recientes</CardTitle>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes notificaciones.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentNotifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link href="/candidate/notifications">Ver todas</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}

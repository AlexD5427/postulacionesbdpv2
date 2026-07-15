import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Accessibility,
  UserPlus,
  FileText,
  Send,
  Sparkles,
  HeartHandshake,
  Lock,
  Headphones,
} from 'lucide-react';
import { getDataProvider } from '@/infrastructure/providers/factory';
import { Button } from '@/design-system/primitives/Button';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Card, CardTitle, CardDescription } from '@/design-system/primitives/Card';
import { Badge } from '@/design-system/primitives/Badge';
import { Reveal, RevealGroup, RevealItem } from '@/design-system/motion/Reveal';
import { JobCard } from '@/features/jobs/components/JobCard';
import { InteractiveImage } from '@/features/media-content/components/InteractiveImage';
import { appConfig } from '@/core/config/app-config';

// Public content page — server-rendered, minimal client JS.
export default async function LandingPage() {
  const provider = getDataProvider();
  const featured = await provider.jobs.getFeatured(3).catch(() => []);

  return (
    <div className="container-page flex flex-col gap-24 py-10 md:py-16">
      {/* HERO */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <Reveal className="flex flex-col gap-6">
          <Badge tone="primary" className="w-fit">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Banco de Desarrollo Productivo BDP S.A.M.
          </Badge>
          <h1 className="text-4xl font-bold leading-[1.05] md:text-5xl">
            Construye tu carrera{' '}
            <span className="text-gradient text-gradient-animated">impulsando el desarrollo</span> de
            Bolivia.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Explora nuestras convocatorias, crea tu perfil profesional y postula de forma sencilla,
            accesible y segura. Nos pondremos en contacto contigo cuando corresponda.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/jobs">
                Ver convocatorias
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link href="/register">Crear cuenta de candidato</Link>
            </Button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
              Sin costo para postular
            </li>
            <li className="flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-primary" aria-hidden />
              Diseñado para todas las personas
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" aria-hidden />
              Privacidad primero
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <GlassSurface
            variant="elevated"
            radius="3xl"
            padding="none"
            className="glass-sheen overflow-hidden"
          >
            <InteractiveImage
              src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=1200&q=70"
              alt="Equipo del banco colaborando en una oficina luminosa"
              className="aspect-[4/3] w-full"
              sizes="(max-width: 1024px) 100vw, 45vw"
              priority
            />
          </GlassSurface>
        </Reveal>
      </section>

      {/* FEATURED JOBS */}
      {featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="flex flex-col gap-6">
          <Reveal className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="featured-heading" className="text-2xl font-bold md:text-3xl">
                Convocatorias destacadas
              </h2>
              <p className="text-muted-foreground">Oportunidades abiertas seleccionadas para ti.</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/jobs">
                Ver todas
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </Reveal>
          <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((job) => (
              <RevealItem key={job.id} className="h-full">
                <JobCard job={job} />
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      )}

      {/* HOW TO APPLY */}
      <section aria-labelledby="how-heading" className="flex flex-col gap-8">
        <Reveal>
          <h2 id="how-heading" className="text-2xl font-bold md:text-3xl">
            Cómo postular
          </h2>
          <p className="text-muted-foreground">Cuatro pasos simples, sin complicaciones.</p>
        </Reveal>
        <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UserPlus, title: 'Crea tu cuenta', body: 'Regístrate con tu correo en menos de un minuto.' },
            { icon: FileText, title: 'Completa tu CV', body: 'Construye tu perfil y CV digital una sola vez.' },
            { icon: Send, title: 'Postula', body: 'Aplica a las convocatorias que te interesen.' },
            { icon: HeartHandshake, title: 'Te contactamos', body: 'El banco se comunicará contigo cuando corresponda.' },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <RevealItem key={step.title} className="h-full">
                <Card className="glass-interactive h-full gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">Paso {index + 1}</span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.body}</CardDescription>
                </Card>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      {/* COMMITMENTS */}
      <section className="grid gap-6 md:grid-cols-3">
        <Reveal className="h-full">
          <Card className="glass-interactive h-full gap-3">
            <Accessibility className="h-7 w-7 text-primary" aria-hidden />
            <CardTitle className="text-lg">Compromiso con la accesibilidad</CardTitle>
            <CardDescription>
              Cumplimos pautas WCAG 2.2 AA. Ajusta tamaño de texto, contraste, movimiento y más desde
              el centro de accesibilidad, disponible en todo momento.
            </CardDescription>
            <Button asChild variant="link" className="mt-1">
              <Link href="/accessibility">Conocer más</Link>
            </Button>
          </Card>
        </Reveal>
        <Reveal delay={0.05} className="h-full">
          <Card className="glass-interactive h-full gap-3">
            <Lock className="h-7 w-7 text-primary" aria-hidden />
            <CardTitle className="text-lg">Privacidad primero</CardTitle>
            <CardDescription>
              Solo recopilamos la información necesaria. Tú controlas tus datos y puedes solicitar su
              exportación o eliminación cuando quieras.
            </CardDescription>
            <Button asChild variant="link" className="mt-1">
              <Link href="/privacy">Ver aviso de privacidad</Link>
            </Button>
          </Card>
        </Reveal>
        <Reveal delay={0.1} className="h-full">
          <Card className="glass-interactive h-full gap-3">
            <Headphones className="h-7 w-7 text-primary" aria-hidden />
            <CardTitle className="text-lg">Estamos para ayudarte</CardTitle>
            <CardDescription>
              ¿Necesitas apoyo o una adaptación para postular? Escríbenos a {appConfig.organization.supportEmail}.
            </CardDescription>
            <Button asChild variant="link" className="mt-1">
              <Link href="/help">Centro de ayuda</Link>
            </Button>
          </Card>
        </Reveal>
      </section>

      {/* CTA */}
      <Reveal>
        <GlassSurface
          variant="floating"
          radius="3xl"
          padding="lg"
          className="glass-sheen flex flex-col items-center gap-4 text-center"
        >
          <h2 className="text-2xl font-bold md:text-3xl">¿List@ para dar el siguiente paso?</h2>
          <p className="max-w-2xl text-muted-foreground">
            Crea tu cuenta y postula a las convocatorias del {appConfig.organization.legalName}.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Crear cuenta</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/jobs">Explorar convocatorias</Link>
            </Button>
          </div>
        </GlassSurface>
      </Reveal>
    </div>
  );
}

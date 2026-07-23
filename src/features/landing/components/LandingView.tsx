'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Accessibility,
  Lock,
  UserPlus,
  FileText,
  Send,
  HeartHandshake,
  Sparkles,
  Briefcase,
  ClipboardCheck,
  IdCard,
  MousePointerClick,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { JobSummary } from '@/shared/types/domain';
import { Button } from '@/design-system/primitives/Button';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Card, CardTitle, CardDescription } from '@/design-system/primitives/Card';
import { Badge } from '@/design-system/primitives/Badge';
import { Reveal, RevealGroup, RevealItem } from '@/design-system/motion/Reveal';
import { AnimatedCounter } from '@/design-system/motion/AnimatedCounter';
import { Marquee } from '@/design-system/motion/Marquee';
import { Spotlight } from '@/design-system/motion/Spotlight';
import { JobCard } from '@/features/jobs/components/JobCard';
import { BdpMark } from '@/shared/components/brand/BdpMark';
import { useTranslation } from '@/features/i18n/use-translation';
import { useReducedMotion } from '@/features/accessibility/hooks/use-reduced-motion';

const SKILLS = [
  'Créditos',
  'Riesgos',
  'Tecnología',
  'Datos y Analítica',
  'Finanzas',
  'Legal',
  'Talento Humano',
  'Atención al cliente',
  'Auditoría',
  'Comunicación',
  'Proyectos',
  'Sostenibilidad',
];

function HeroVisual() {
  const reduced = useReducedMotion();
  return (
    <div className="relative aspect-square w-full max-w-md" aria-hidden>
      {/* central glass medallion with the BDP mark */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        className="glass-brand absolute left-1/2 top-1/2 grid h-44 w-44 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2.5rem] p-8 shadow-glass-xl md:h-56 md:w-56"
      >
        <BdpMark tone="gradient" className="h-full w-full" />
      </motion.div>
      {/* floating liquid orbs */}
      <span
        className="liquid-orb left-[6%] top-[12%] h-24 w-24"
        style={{ ['--orb-float' as string]: '7s' }}
      />
      <span
        className="liquid-orb bottom-[10%] right-[4%] h-32 w-32"
        style={{ ['--orb-float' as string]: '9s' }}
      />
      <span
        className="liquid-orb bottom-[24%] left-[2%] h-16 w-16 opacity-80"
        style={{ ['--orb-float' as string]: '6s' }}
      />
      <span
        className="liquid-orb right-[14%] top-[6%] h-12 w-12 opacity-70"
        style={{ ['--orb-float' as string]: '8s' }}
      />
    </div>
  );
}

export function LandingView({ featured }: { featured: JobSummary[] }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const offers = [
    { icon: IdCard, title: t('home.offer.profile.title'), body: t('home.offer.profile.body') },
    { icon: FileText, title: t('home.offer.cv.title'), body: t('home.offer.cv.body') },
    { icon: Briefcase, title: t('home.offer.jobs.title'), body: t('home.offer.jobs.body') },
    { icon: ClipboardCheck, title: t('home.offer.assessments.title'), body: t('home.offer.assessments.body') },
  ];

  const steps = [
    { icon: UserPlus, title: t('home.how.s1.title'), body: t('home.how.s1.body') },
    { icon: FileText, title: t('home.how.s2.title'), body: t('home.how.s2.body') },
    { icon: Send, title: t('home.how.s3.title'), body: t('home.how.s3.body') },
    { icon: HeartHandshake, title: t('home.how.s4.title'), body: t('home.how.s4.body') },
  ];

  const voices = [
    { quote: t('home.voices.q1'), name: 'María Q.', role: t('home.voices.r1'), initials: 'MQ' },
    { quote: t('home.voices.q2'), name: 'Jorge M.', role: t('home.voices.r2'), initials: 'JM' },
    { quote: t('home.voices.q3'), name: 'Lucía V.', role: t('home.voices.r3'), initials: 'LV' },
  ];

  const titleWords = [
    { text: t('home.hero.title.a'), gradient: false },
    { text: t('home.hero.title.b'), gradient: true },
    { text: t('home.hero.title.c'), gradient: false },
  ];

  return (
    <div className="flex flex-col gap-24 py-10 md:gap-32 md:py-16">
      {/* ---------- HERO ---------- */}
      <section className="container-page grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6">
          <Reveal>
            <Badge tone="primary" className="w-fit">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t('home.hero.badge')}
            </Badge>
          </Reveal>

          <h1 className="text-display text-5xl md:text-6xl">
            {titleWords.map((word, i) => (
              <span key={i} className="mr-[0.25em] inline-block overflow-hidden align-bottom">
                <motion.span
                  className={word.gradient ? 'text-gradient text-gradient-animated inline-block' : 'inline-block'}
                  initial={reduced ? false : { y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.1 + i * 0.12 }}
                >
                  {word.text}
                </motion.span>
              </span>
            ))}
          </h1>

          <Reveal delay={0.15}>
            <p className="max-w-xl text-lg text-muted-foreground">{t('home.hero.subtitle')}</p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/jobs">
                  {t('home.hero.ctaPrimary')}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="glass">
                <Link href="/register">{t('home.hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                {t('home.hero.trust.free')}
              </li>
              <li className="flex items-center gap-2">
                <Accessibility className="h-4 w-4 text-primary" aria-hidden />
                {t('home.hero.trust.a11y')}
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" aria-hidden />
                {t('home.hero.trust.privacy')}
              </li>
            </ul>
          </Reveal>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroVisual />
        </div>
      </section>

      {/* ---------- OFFER SHOWCASE ---------- */}
      <section className="container-page flex flex-col gap-8">
        <Reveal className="flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">{t('home.offer.title')}</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">{t('home.offer.subtitle')}</p>
        </Reveal>
        <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map((offer) => {
            const Icon = offer.icon;
            return (
              <RevealItem key={offer.title} className="h-full">
                <Spotlight className="h-full">
                  <Card className="glass-interactive h-full gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <CardTitle className="text-lg">{offer.title}</CardTitle>
                    <CardDescription>{offer.body}</CardDescription>
                  </Card>
                </Spotlight>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      {/* ---------- STATS (brand panel) ---------- */}
      <section className="px-3">
        <Reveal>
          <div className="section-brand grain container-page mx-auto grid gap-10 rounded-4xl px-6 py-14 md:px-12 md:py-16 lg:grid-cols-[1fr_1.2fr]">
            <div className="relative z-content flex flex-col justify-center gap-3">
              <h2 className="text-3xl font-bold md:text-4xl">{t('home.stats.title')}</h2>
              <p className="max-w-md text-on-brand-muted">{t('home.stats.subtitle')}</p>
            </div>
            <div className="relative z-content grid grid-cols-3 gap-4">
              {[
                { value: 12, suffix: '+', label: t('home.stats.areas') },
                { value: 9, suffix: '', label: t('home.stats.cities') },
                { value: null, label: t('home.stats.commitment'), text: 'AA' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 rounded-3xl bg-white/10 p-5 text-center backdrop-blur-sm"
                >
                  <span className="text-4xl font-bold text-white md:text-5xl">
                    {stat.value === null ? (
                      stat.text
                    ) : (
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    )}
                  </span>
                  <span className="text-xs font-medium text-on-brand-muted md:text-sm">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- FEATURED JOBS ---------- */}
      {featured.length > 0 && (
        <section className="container-page flex flex-col gap-6" aria-labelledby="featured-heading">
          <Reveal className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="featured-heading" className="text-3xl font-bold md:text-4xl">
                {t('home.featured.title')}
              </h2>
              <p className="text-muted-foreground">{t('home.featured.subtitle')}</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/jobs">
                {t('action.viewAll')}
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

      {/* ---------- SKILLS MARQUEE ---------- */}
      <section aria-labelledby="marquee-heading" className="flex flex-col gap-6">
        <Reveal className="container-page">
          <h2 id="marquee-heading" className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('home.marquee.title')}
          </h2>
        </Reveal>
        <Marquee durationSeconds={38}>
          {SKILLS.map((skill) => (
            <span
              key={skill}
              className="glass-subtle mx-1.5 inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium text-foreground"
            >
              <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden />
              {skill}
            </span>
          ))}
        </Marquee>
      </section>

      {/* ---------- HOW TO APPLY ---------- */}
      <section className="container-page flex flex-col gap-8" aria-labelledby="how-heading">
        <Reveal>
          <h2 id="how-heading" className="text-3xl font-bold md:text-4xl">
            {t('home.how.title')}
          </h2>
          <p className="text-muted-foreground">{t('home.how.subtitle')}</p>
        </Reveal>
        <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <RevealItem key={step.title} className="h-full">
                <Card className="glass-interactive h-full gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {t('home.how.step')} {index + 1}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.body}</CardDescription>
                </Card>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      {/* ---------- VOICES / TESTIMONIALS ---------- */}
      <section className="container-page flex flex-col gap-8" aria-labelledby="voices-heading">
        <Reveal className="text-center">
          <h2 id="voices-heading" className="text-3xl font-bold md:text-4xl">
            {t('home.voices.title')}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">{t('home.voices.subtitle')}</p>
        </Reveal>
        <RevealGroup className="grid gap-6 md:grid-cols-3">
          {voices.map((voice) => (
            <RevealItem key={voice.name} className="h-full">
              <GlassSurface variant="elevated" radius="3xl" padding="lg" className="glass-sheen flex h-full flex-col gap-4">
                <p className="text-lg leading-relaxed">“{voice.quote}”</p>
                <div className="mt-auto flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {voice.initials}
                  </span>
                  <div>
                    <p className="font-semibold">{voice.name}</p>
                    <p className="text-sm text-muted-foreground">{voice.role}</p>
                  </div>
                </div>
              </GlassSurface>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ---------- CTA (brand panel) ---------- */}
      <section className="px-3">
        <Reveal>
          <div className="section-brand grain container-page mx-auto flex flex-col items-center gap-5 rounded-4xl px-6 py-16 text-center md:py-20">
            <span className="relative z-content grid h-16 w-16 place-items-center rounded-3xl bg-white/15 p-3 backdrop-blur">
              <BdpMark tone="white" className="h-full w-full" />
            </span>
            <h2 className="relative z-content max-w-2xl text-3xl font-bold md:text-4xl">
              {t('home.cta.title')}
            </h2>
            <p className="relative z-content max-w-2xl text-on-brand-muted">{t('home.cta.subtitle')}</p>
            <div className="relative z-content flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="glass" className="text-primary">
                <Link href="/register">{t('home.cta.primary')}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="border border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/jobs">
                  {t('home.cta.secondary')}
                  <MousePointerClick className="h-5 w-5" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

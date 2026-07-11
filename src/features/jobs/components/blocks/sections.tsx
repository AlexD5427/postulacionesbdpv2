import {
  CheckCircle2,
  ListChecks,
  Sparkles,
  MapPin,
  Quote as QuoteIcon,
  Info,
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  ClipboardCheck,
  Mail,
  Phone,
  FileDown,
} from 'lucide-react';
import type {
  CalloutBlock,
  ContactHelpBlock,
  DownloadableResourceBlock,
  FaqBlock,
  GalleryBlock,
  InstructionsBlock,
  ListBlock,
  LocationBlock,
  QuoteBlock,
  RichTextBlock,
  StatisticsBlock,
  SummaryBlock,
  AssessmentInfoBlock,
  VideoBlock,
} from '@/shared/types/domain';
import { GlassSurface } from '@/design-system/primitives/GlassSurface';
import { Badge } from '@/design-system/primitives/Badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/design-system/primitives/Accordion';
import { WORK_MODE_LABELS } from '../../lib/labels';
import { RichText } from '@/features/media-content/renderers/RichText';
import { ImageGallery } from '@/features/media-content/renderers/ImageGallery';
import { AccessibleVideo } from '@/features/media-content/renderers/AccessibleVideo';

function BlockHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold">{children}</h2>;
}

export function SummarySection({ block }: { block: SummaryBlock }) {
  return (
    <section className="flex flex-col gap-3">
      {block.heading && <BlockHeading>{block.heading}</BlockHeading>}
      <p className="text-lg leading-relaxed text-muted-foreground">{block.body}</p>
    </section>
  );
}

export function RichTextSection({ block }: { block: RichTextBlock }) {
  return (
    <section className="flex flex-col gap-3">
      {block.heading && <BlockHeading>{block.heading}</BlockHeading>}
      <RichText nodes={block.content} />
    </section>
  );
}

export function ListSection({ block }: { block: ListBlock }) {
  const Icon = block.type === 'benefits' ? Sparkles : block.type === 'requirements' ? ListChecks : CheckCircle2;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BlockHeading>{block.heading}</BlockHeading>
        {block.variant === 'desirable' && <Badge tone="neutral">Deseable</Badge>}
        {block.variant === 'minimum' && <Badge tone="primary">Requisito</Badge>}
      </div>
      <ul className="grid list-none gap-3 sm:grid-cols-2">
        {block.items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LocationSection({ block }: { block: LocationBlock }) {
  return (
    <section className="flex flex-col gap-3">
      {block.heading && <BlockHeading>{block.heading}</BlockHeading>}
      <GlassSurface variant="subtle" radius="2xl" padding="md" className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-medium">{block.city}</p>
          {block.address && <p className="text-sm text-muted-foreground">{block.address}</p>}
          <p className="text-sm text-muted-foreground">Modalidad: {WORK_MODE_LABELS[block.workMode]}</p>
        </div>
      </GlassSurface>
    </section>
  );
}

export function GallerySection({ block }: { block: GalleryBlock }) {
  return (
    <section className="flex flex-col gap-4">
      {block.heading && <BlockHeading>{block.heading}</BlockHeading>}
      <ImageGallery assets={block.assets} />
    </section>
  );
}

export function VideoSection({ block }: { block: VideoBlock }) {
  return (
    <section className="flex flex-col gap-4">
      {block.heading && <BlockHeading>{block.heading}</BlockHeading>}
      <AccessibleVideo asset={block.asset} />
    </section>
  );
}

export function QuoteSection({ block }: { block: QuoteBlock }) {
  return (
    <GlassSurface variant="standard" radius="3xl" padding="lg" className="flex flex-col gap-3">
      <QuoteIcon className="h-7 w-7 text-primary/60" aria-hidden />
      <blockquote className="text-xl font-medium leading-relaxed">{block.quote}</blockquote>
      {block.attribution && <cite className="text-sm not-italic text-muted-foreground">— {block.attribution}</cite>}
    </GlassSurface>
  );
}

export function StatisticsSection({ block }: { block: StatisticsBlock }) {
  return (
    <section className="flex flex-col gap-4">
      {block.heading && <BlockHeading>{block.heading}</BlockHeading>}
      <dl className="grid gap-4 sm:grid-cols-3">
        {block.stats.map((stat, index) => (
          <GlassSurface key={index} variant="subtle" radius="2xl" padding="md" className="text-center">
            <dt className="order-2 text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="order-1 text-3xl font-bold text-gradient">{stat.value}</dd>
          </GlassSurface>
        ))}
      </dl>
    </section>
  );
}

export function CalloutSection({ block }: { block: CalloutBlock }) {
  const iconColor =
    block.tone === 'warning' ? 'text-warning' : block.tone === 'success' ? 'text-success' : 'text-info';
  const Icon = block.tone === 'warning' ? AlertTriangle : Info;
  return (
    <GlassSurface variant="subtle" radius="2xl" padding="md" className="flex items-start gap-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} aria-hidden />
      <div>
        <p className="font-semibold">{block.title}</p>
        <p className="text-muted-foreground">{block.body}</p>
      </div>
    </GlassSurface>
  );
}

export function FaqSection({ block }: { block: FaqBlock }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-6 w-6 text-primary" aria-hidden />
        <BlockHeading>{block.heading ?? 'Preguntas frecuentes'}</BlockHeading>
      </div>
      <GlassSurface variant="subtle" radius="2xl" padding="md">
        <Accordion type="single" collapsible>
          {block.items.map((item, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </GlassSurface>
    </section>
  );
}

export function InstructionsSection({ block }: { block: InstructionsBlock }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" aria-hidden />
        <BlockHeading>{block.heading ?? 'Cómo postular'}</BlockHeading>
      </div>
      <ol className="flex flex-col gap-3">
        {block.steps.map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AssessmentInfoSection({ block }: { block: AssessmentInfoBlock }) {
  return (
    <GlassSurface variant="standard" radius="2xl" padding="lg" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-primary" aria-hidden />
        <BlockHeading>{block.heading ?? 'Sobre la evaluación'}</BlockHeading>
      </div>
      <p className="text-muted-foreground">{block.body}</p>
    </GlassSurface>
  );
}

export function ContactHelpSection({ block }: { block: ContactHelpBlock }) {
  return (
    <GlassSurface variant="subtle" radius="2xl" padding="md" className="flex flex-col gap-3">
      <BlockHeading>{block.heading ?? '¿Necesitas ayuda?'}</BlockHeading>
      <div className="flex flex-col gap-2 text-muted-foreground">
        <a className="flex items-center gap-2 hover:text-foreground" href={`mailto:${block.email}`}>
          <Mail className="h-4 w-4" aria-hidden /> {block.email}
        </a>
        {block.phone && (
          <a className="flex items-center gap-2 hover:text-foreground" href={`tel:${block.phone}`}>
            <Phone className="h-4 w-4" aria-hidden /> {block.phone}
          </a>
        )}
      </div>
    </GlassSurface>
  );
}

export function DownloadableResourceSection({ block }: { block: DownloadableResourceBlock }) {
  return (
    <section className="flex flex-col gap-3">
      {block.heading && <BlockHeading>{block.heading}</BlockHeading>}
      <ul className="flex list-none flex-col gap-2">
        {block.resources.map((resource) => (
          <li key={resource.assetId}>
            <span className="flex items-center gap-2 text-muted-foreground">
              <FileDown className="h-4 w-4 text-primary" aria-hidden />
              {resource.label}
              {resource.sizeLabel && <span className="text-xs">({resource.sizeLabel})</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

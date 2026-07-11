import type { JobContentBlock } from '@/shared/types/domain';
import { Reveal } from '@/design-system/motion/Reveal';
import { logger } from '@/core/observability/logger';
import {
  AssessmentInfoSection,
  CalloutSection,
  ContactHelpSection,
  DownloadableResourceSection,
  FaqSection,
  GallerySection,
  InstructionsSection,
  ListSection,
  LocationSection,
  QuoteSection,
  RichTextSection,
  StatisticsSection,
  SummarySection,
  VideoSection,
} from './sections';

/**
 * Block renderer registry: maps a validated block type to its renderer. The
 * `hero` block is rendered separately by the page header, so it is skipped
 * here. Unknown/unsupported block types fail gracefully — they render nothing
 * and log a developer warning rather than crashing the page (§10).
 */
export function JobBlockRenderer({ block }: { block: JobContentBlock }) {
  if (!block.visible || block.status !== 'published') return null;

  const content = renderBlock(block);
  if (content === null) return null;

  return <Reveal className="scroll-mt-24">{content}</Reveal>;
}

function renderBlock(block: JobContentBlock): React.ReactNode {
  switch (block.type) {
    case 'hero':
      return null; // handled by the page hero
    case 'summary':
      return <SummarySection block={block} />;
    case 'rich_text':
      return <RichTextSection block={block} />;
    case 'responsibilities':
    case 'requirements':
    case 'benefits':
      return <ListSection block={block} />;
    case 'location':
      return <LocationSection block={block} />;
    case 'image_gallery':
      return <GallerySection block={block} />;
    case 'video':
      return <VideoSection block={block} />;
    case 'quote':
      return <QuoteSection block={block} />;
    case 'statistics':
      return <StatisticsSection block={block} />;
    case 'callout':
      return <CalloutSection block={block} />;
    case 'faq':
      return <FaqSection block={block} />;
    case 'application_instructions':
      return <InstructionsSection block={block} />;
    case 'assessment_info':
      return <AssessmentInfoSection block={block} />;
    case 'contact_help':
      return <ContactHelpSection block={block} />;
    case 'downloadable_resource':
      return <DownloadableResourceSection block={block} />;
    default: {
      // Exhaustiveness guard + graceful degradation for unknown future types.
      const unknownType = (block as { type?: string }).type ?? 'unknown';
      logger.warn('job block: tipo no soportado, se omite', { type: unknownType });
      return null;
    }
  }
}

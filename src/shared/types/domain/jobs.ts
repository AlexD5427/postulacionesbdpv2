import type { ISODateString, ProviderMetadata } from './common';
import type { EmploymentType, ExperienceLevel, WorkMode } from './candidate';
import type { MediaAsset, MotionPreset } from './media';

/**
 * Headless, schema-driven job content.
 *
 * A `JobPublication` is rendered from an ordered list of `JobContentBlock`s so
 * the ATS can compose pages without frontend changes. The public portal MUST
 * NOT expose any internal decision fields (rank, fit score, stage). See
 * §Critical product rules and MEDIA_CONTENT_MODEL.md.
 */
export type JobBlockType =
  | 'hero'
  | 'summary'
  | 'rich_text'
  | 'responsibilities'
  | 'requirements'
  | 'benefits'
  | 'location'
  | 'image_gallery'
  | 'video'
  | 'quote'
  | 'statistics'
  | 'callout'
  | 'faq'
  | 'application_instructions'
  | 'assessment_info'
  | 'contact_help'
  | 'downloadable_resource';

export interface JobBlockBase {
  id: string;
  type: JobBlockType;
  order: number;
  visible: boolean;
  themeVariant?: 'default' | 'primary' | 'accent' | 'muted';
  layoutVariant?: 'default' | 'split' | 'centered' | 'wide';
  background?: 'none' | 'glass' | 'gradient' | 'media';
  motionPreset?: MotionPreset;
  mobileLayout?: 'stack' | 'compact';
  publishAt?: ISODateString;
  status: 'draft' | 'published';
  schemaVersion: number;
}

/** Restricted rich-text node — NO raw HTML is ever accepted from a provider. */
export interface RichTextNode {
  type: 'paragraph' | 'heading' | 'list' | 'list_item' | 'quote';
  text?: string;
  level?: 2 | 3 | 4;
  ordered?: boolean;
  marks?: Array<'bold' | 'italic'>;
  children?: RichTextNode[];
}

export interface HeroBlock extends JobBlockBase {
  type: 'hero';
  title: string;
  subtitle?: string;
  media?: MediaAsset;
}
export interface SummaryBlock extends JobBlockBase {
  type: 'summary';
  heading?: string;
  body: string;
}
export interface RichTextBlock extends JobBlockBase {
  type: 'rich_text';
  heading?: string;
  content: RichTextNode[];
}
export interface ListBlock extends JobBlockBase {
  type: 'responsibilities' | 'requirements' | 'benefits';
  heading: string;
  items: string[];
  /** For requirements: separate minimum vs. desirable without any scoring. */
  variant?: 'minimum' | 'desirable' | 'general';
}
export interface LocationBlock extends JobBlockBase {
  type: 'location';
  heading?: string;
  city: string;
  address?: string;
  workMode: WorkMode;
  media?: MediaAsset;
}
export interface GalleryBlock extends JobBlockBase {
  type: 'image_gallery';
  heading?: string;
  assets: MediaAsset[];
}
export interface VideoBlock extends JobBlockBase {
  type: 'video';
  heading?: string;
  asset: MediaAsset;
}
export interface QuoteBlock extends JobBlockBase {
  type: 'quote';
  quote: string;
  attribution?: string;
}
export interface StatisticsBlock extends JobBlockBase {
  type: 'statistics';
  heading?: string;
  stats: Array<{ label: string; value: string }>;
}
export interface CalloutBlock extends JobBlockBase {
  type: 'callout';
  tone: 'info' | 'success' | 'warning';
  title: string;
  body: string;
}
export interface FaqBlock extends JobBlockBase {
  type: 'faq';
  heading?: string;
  items: Array<{ question: string; answer: string }>;
}
export interface InstructionsBlock extends JobBlockBase {
  type: 'application_instructions';
  heading?: string;
  steps: string[];
}
export interface AssessmentInfoBlock extends JobBlockBase {
  type: 'assessment_info';
  heading?: string;
  body: string;
  assessmentId?: string;
}
export interface ContactHelpBlock extends JobBlockBase {
  type: 'contact_help';
  heading?: string;
  email: string;
  phone?: string;
}
export interface DownloadableResourceBlock extends JobBlockBase {
  type: 'downloadable_resource';
  heading?: string;
  resources: Array<{ label: string; assetId: string; sizeLabel?: string }>;
}

export type JobContentBlock =
  | HeroBlock
  | SummaryBlock
  | RichTextBlock
  | ListBlock
  | LocationBlock
  | GalleryBlock
  | VideoBlock
  | QuoteBlock
  | StatisticsBlock
  | CalloutBlock
  | FaqBlock
  | InstructionsBlock
  | AssessmentInfoBlock
  | ContactHelpBlock
  | DownloadableResourceBlock;

/** A configurable question attached to a job's application flow. */
export interface JobApplicationQuestion {
  id: string;
  prompt: string;
  type: 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'boolean' | 'numeric';
  required: boolean;
  options?: string[];
  helpText?: string;
  order: number;
}

export interface JobPublication {
  meta: ProviderMetadata;
  /** Public, human-friendly reference shown to candidates (e.g. BDP-CRE-001). */
  reference: string;
  title: string;
  area: string;
  city: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  shortDescription: string;
  publishedAt: ISODateString;
  closesAt: ISODateString | null;
  status: 'published' | 'paused' | 'closed';
  featured: boolean;
  coverImage?: MediaAsset;
  blocks: JobContentBlock[];
  applicationQuestions: JobApplicationQuestion[];
  assessmentId?: string;
  tags: string[];
}

/** Lightweight summary used by directory cards (no heavy blocks). */
export interface JobSummary {
  id: string;
  reference: string;
  title: string;
  area: string;
  city: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  shortDescription: string;
  publishedAt: ISODateString;
  closesAt: ISODateString | null;
  featured: boolean;
  coverImageUrl?: string;
  coverImageAlt?: string;
  sourceProvider: ProviderMetadata['sourceProvider'];
}

export interface JobFilters {
  query?: string;
  area?: string;
  city?: string;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  sort?: 'recent' | 'closing_soon' | 'title';
}

import type { SourceProvider } from './common';

/**
 * Media asset model. We never assume assets are public: `signedURLRequired`
 * flags future R2 private objects that need a temporary signed URL fetched
 * server-side. `focalPoint*` drives art-directed cropping.
 */
export type MediaType = 'image' | 'video' | 'gallery' | 'embed' | 'model_360' | 'model_viewer';

export interface MediaAsset {
  id: string;
  type: MediaType;
  provider: SourceProvider;
  storageKey?: string;
  publicPreviewURL?: string;
  signedURLRequired: boolean;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  aspectRatio?: string;
  altText: string;
  caption?: string;
  transcript?: string;
  posterAsset?: MediaAsset;
  focalPointX?: number; // 0..1
  focalPointY?: number; // 0..1
  interactionPreset?: InteractionPreset;
  motionPreset?: MotionPreset;
  mobileFallback?: string;
  reducedMotionFallback?: string;
  accessibilityDescription?: string;
  visibility: 'public' | 'authenticated' | 'private';
  publicationStatus: 'draft' | 'published' | 'archived';
}

export type InteractionPreset = 'none' | 'tilt' | 'depth' | 'lens' | 'parallax' | 'scale';
export type MotionPreset =
  | 'none'
  | 'fade'
  | 'rise'
  | 'reveal'
  | 'float'
  | 'zoom-soft';

import type { MediaAsset, ProviderMetadata, SourceProvider } from '@/shared/types/domain';

/** Build deterministic provider metadata for seed records. */
export function mockMeta(
  id: string,
  externalReference: string,
  sourceProvider: SourceProvider = 'mock',
  authoritative = true,
): ProviderMetadata {
  return {
    id,
    externalReference,
    sourceProvider,
    authoritative,
    sourceVersion: '1',
    lastSynchronizedAt: '2026-01-05T12:00:00.000Z',
  };
}

/** Convenience builder for a public image asset. */
export function image(
  id: string,
  url: string,
  altText: string,
  opts?: Partial<MediaAsset>,
): MediaAsset {
  return {
    id,
    type: 'image',
    provider: 'mock',
    publicPreviewURL: url,
    signedURLRequired: false,
    mimeType: 'image/jpeg',
    aspectRatio: '16/9',
    altText,
    focalPointX: 0.5,
    focalPointY: 0.4,
    interactionPreset: 'tilt',
    motionPreset: 'reveal',
    visibility: 'public',
    publicationStatus: 'published',
    ...opts,
  };
}

/**
 * Cross-cutting domain primitives.
 *
 * `ProviderMetadata` is attached to every entity that can originate from more
 * than one backend (Supabase, Google Sheets/Apps Script, mock). It powers
 * deduplication, conflict resolution and future migration — see
 * HYBRID_SUPABASE_APPS_SCRIPT.md.
 */
export type SourceProvider = 'supabase' | 'google_sheets' | 'mock' | 'archive_api' | 'object_storage';

export interface ProviderMetadata {
  /** Internal, stable UUID owned by the frontend/domain. */
  id: string;
  /** Stable cross-provider identifier used to dedupe & migrate. */
  externalReference: string;
  sourceProvider: SourceProvider;
  /** Whether this record's provider is the current source of truth. */
  authoritative: boolean;
  sourceVersion?: string;
  lastSynchronizedAt?: string;
}

export type ISODateString = string;

export interface Paginated<T> {
  items: T[];
  /** Opaque cursor for the next page, or null when exhausted. */
  nextCursor: string | null;
  totalHint?: number;
}

export interface PageRequest {
  cursor?: string | null;
  limit?: number;
}

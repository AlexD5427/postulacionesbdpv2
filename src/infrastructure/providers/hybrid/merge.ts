import type { JobSummary, SourceProvider } from '@/shared/types/domain';

/**
 * Deterministic merge of job summaries coming from multiple providers.
 *
 * Source-of-truth policy (see HYBRID_SUPABASE_APPS_SCRIPT.md):
 *   1. Deduplicate by stable `reference` (externalReference).
 *   2. Prefer the provider explicitly ranked as more authoritative.
 *   3. Supabase outranks Google Sheets outranks mock.
 *   4. Tie-break on most recent `publishedAt`.
 *
 * The function is pure and side-effect free so it is easy to unit test.
 */
const PROVIDER_RANK: Record<SourceProvider, number> = {
  supabase: 100,
  archive_api: 60,
  google_sheets: 40,
  object_storage: 20,
  mock: 10,
};

export interface MergeSource {
  provider: SourceProvider;
  items: JobSummary[];
}

function preferred(a: JobSummary, b: JobSummary): JobSummary {
  const rankA = PROVIDER_RANK[a.sourceProvider] ?? 0;
  const rankB = PROVIDER_RANK[b.sourceProvider] ?? 0;
  if (rankA !== rankB) return rankA > rankB ? a : b;
  // Same provider rank -> newest publication wins.
  return new Date(a.publishedAt).getTime() >= new Date(b.publishedAt).getTime() ? a : b;
}

export function mergeJobSummaries(sources: MergeSource[]): JobSummary[] {
  const byReference = new Map<string, JobSummary>();

  for (const source of sources) {
    for (const item of source.items) {
      const key = item.reference || item.id;
      const existing = byReference.get(key);
      byReference.set(key, existing ? preferred(existing, item) : item);
    }
  }

  return [...byReference.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

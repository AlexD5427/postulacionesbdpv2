import type { PublicAssessmentsRepository } from '@/core/data/public-assessments';
import { logger } from '@/core/observability/logger';
import { createAppsScriptPublicAssessmentsRepository } from './public-assessments-client';
import { createDemoPublicAssessmentsRepository } from './demo-public-assessments';
import { evaluationsEndpoint, isDemoMode } from './endpoint';

/**
 * Adapter selection for the public assessment module.
 *
 * Three outcomes, no ambiguity:
 *  · endpoint configured → real Apps Script adapter;
 *  · no endpoint + explicit mock mode → local demo adapter (banner shown);
 *  · no endpoint anywhere else → the real adapter, which fails fast with a
 *    configuration error. We deliberately do NOT fake success in that case.
 */
let singleton: PublicAssessmentsRepository | null = null;

export function createPublicAssessmentsRepository(): PublicAssessmentsRepository {
  if (evaluationsEndpoint().status === 'ready') {
    return createAppsScriptPublicAssessmentsRepository();
  }
  if (isDemoMode()) {
    logger.info('evaluations: sin endpoint configurado; usando datos de demostración');
    return createDemoPublicAssessmentsRepository();
  }
  return createAppsScriptPublicAssessmentsRepository();
}

/** Memoised repository. */
export function getPublicAssessmentsRepository(): PublicAssessmentsRepository {
  if (!singleton) singleton = createPublicAssessmentsRepository();
  return singleton;
}

/** Test helper: drop the memoised instance. */
export function __resetPublicAssessmentsRepository(): void {
  singleton = null;
}

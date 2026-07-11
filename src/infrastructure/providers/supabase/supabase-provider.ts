import type { DataProvider } from '@/core/data/repositories';
import { logger } from '@/core/observability/logger';
import { createMockProvider } from '../mock/mock-provider';

/**
 * Supabase provider BOUNDARY.
 *
 * This file marks exactly where the Supabase integration plugs in. The MVP
 * ships without credentials, so every method currently delegates to the mock
 * provider. When integrating:
 *
 *   1. `npm i @supabase/supabase-js`
 *   2. Create a browser client with NEXT_PUBLIC_SUPABASE_URL + ANON_KEY.
 *   3. Replace the delegated repositories below one at a time (auth first).
 *   4. Keep the domain mappers in `infrastructure/mappers` as the seam so UI
 *      never sees a Supabase row shape.
 *
 * The frontend must NEVER receive the service-role key — privileged writes go
 * through a server route/action. See BACKEND_INTEGRATION_PLAN.md.
 */
export interface SupabaseProviderConfig {
  url: string;
  anonKey: string;
}

export function createSupabaseProvider(config: SupabaseProviderConfig): DataProvider {
  if (!config.url || !config.anonKey) {
    logger.warn('supabase: configuración incompleta; usando proveedor mock como respaldo');
  } else {
    logger.info('supabase: boundary activo (integración pendiente); usando mock como respaldo');
  }

  const delegate = createMockProvider();

  // Structurally a Supabase provider; behaviourally mock until the client is
  // wired in. Swapping any repository here does not touch the UI.
  return {
    ...delegate,
    mode: 'supabase',
  };
}

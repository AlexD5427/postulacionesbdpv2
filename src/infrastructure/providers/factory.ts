import type { DataProvider } from '@/core/data/repositories';
import { env } from '@/core/config/env';
import { logger } from '@/core/observability/logger';
import { createMockProvider } from './mock/mock-provider';
import { createSupabaseProvider } from './supabase/supabase-provider';
import { createAppsScriptProvider } from './google-apps-script/apps-script-provider';
import { createHybridProvider } from './hybrid/hybrid-provider';

/**
 * Select and build the active {@link DataProvider} from validated env.
 *
 * `mock` needs zero configuration. Other modes degrade gracefully to mock when
 * their credentials/endpoints are missing so the app is always runnable.
 */
export function createDataProvider(): DataProvider {
  const mode = env.NEXT_PUBLIC_DATA_MODE;

  switch (mode) {
    case 'supabase':
      return createSupabaseProvider({
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

    case 'apps-script': {
      if (!env.NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL) {
        logger.warn('data: modo apps-script sin URL; usando mock');
        return createMockProvider();
      }
      return createAppsScriptProvider(env.NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL);
    }

    case 'hybrid': {
      const primary = env.NEXT_PUBLIC_SUPABASE_URL
        ? createSupabaseProvider({
            url: env.NEXT_PUBLIC_SUPABASE_URL,
            anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          })
        : createMockProvider();
      const secondary = env.NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL
        ? createAppsScriptProvider(env.NEXT_PUBLIC_APPS_SCRIPT_PUBLIC_READ_URL)
        : null;
      return createHybridProvider(primary, secondary);
    }

    case 'mock':
    default:
      return createMockProvider();
  }
}

let singleton: DataProvider | null = null;

/**
 * Memoised provider. Safe on both server (RSC) and client because the mock
 * store transparently uses memory on the server and localStorage in the
 * browser.
 */
export function getDataProvider(): DataProvider {
  if (!singleton) singleton = createDataProvider();
  return singleton;
}

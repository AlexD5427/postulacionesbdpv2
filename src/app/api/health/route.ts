import { NextResponse } from 'next/server';
import { env } from '@/core/config/env';

export const dynamic = 'force-dynamic';

/**
 * Liveness/readiness endpoint. Returns non-sensitive status only — never any
 * secret or provider credential. See OBSERVABILITY / SECURITY docs.
 */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'bdp-candidate-portal',
    dataMode: env.NEXT_PUBLIC_DATA_MODE,
    environment: env.NEXT_PUBLIC_APP_ENV,
    timestamp: new Date().toISOString(),
  });
}

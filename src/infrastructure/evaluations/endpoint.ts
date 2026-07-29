import { env } from '@/core/config/env';

/**
 * Resolution of the public Evaluations endpoint.
 *
 * A wrong URL cannot be "tried anyway": either we call the right Web App or we
 * call nothing. The ATS repository learned this the hard way (see
 * `docs/evaluations/REPARACION_2026-07.md`), where one environment variable held
 * another variable's value and the resulting network error sent everybody
 * looking in the wrong place. So we classify the configuration up front and
 * name the variable in the operator-facing message.
 */

export type EndpointStatus =
  /** Absolute, plausible Web App URL — real integration active. */
  | 'ready'
  /** No URL configured. */
  | 'missing'
  /** A URL is configured but it cannot be the Evaluations Web App. */
  | 'invalid';

export interface EvaluationsEndpoint {
  status: EndpointStatus;
  /** Empty unless `status === 'ready'`. */
  url: string;
  /** Operator-facing explanation (never shown to candidates). */
  diagnostic: string;
}

const VARIABLE = 'NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL';

/**
 * Classify a raw value. Exported for tests so the rules are checkable without
 * mutating `process.env`.
 */
export function classifyEvaluationsEndpoint(raw: string | undefined): EvaluationsEndpoint {
  const value = (raw ?? '').trim();
  if (!value) {
    return {
      status: 'missing',
      url: '',
      diagnostic: `Falta ${VARIABLE}: debe contener la dirección completa del Web App de Evaluaciones (https://script.google.com/macros/s/…/exec).`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      status: 'invalid',
      url: '',
      diagnostic: `${VARIABLE} no es una URL absoluta. Debe empezar por https:// y no ser una ruta interna del portal.`,
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      status: 'invalid',
      url: '',
      diagnostic: `${VARIABLE} debe usar https://.`,
    };
  }

  // Guard against pointing the public runner at an administrative surface.
  if (/\/api\/evaluations(\/|$)/i.test(parsed.pathname) || /admin/i.test(parsed.pathname)) {
    return {
      status: 'invalid',
      url: '',
      diagnostic: `${VARIABLE} apunta a una ruta administrativa. El módulo público solo puede usar el Web App de Evaluaciones (…/exec).`,
    };
  }

  // Apps Script deployments end in `/exec` (production) or `/dev` (test build).
  if (!/\/(exec|dev)$/.test(parsed.pathname)) {
    return {
      status: 'invalid',
      url: '',
      diagnostic: `${VARIABLE} debe terminar en /exec (o /dev para un despliegue de prueba). Copia la dirección del despliegue del Web App de Evaluaciones, no la del editor de Apps Script.`,
    };
  }

  return { status: 'ready', url: parsed.toString(), diagnostic: '' };
}

/** The endpoint for the current environment. */
export function evaluationsEndpoint(): EvaluationsEndpoint {
  return classifyEvaluationsEndpoint(env.NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL);
}

/**
 * Should the module run against local demo data?
 *
 * Only when there is no endpoint AND the deployment is explicitly in mock mode
 * with mocks enabled. Never a silent fallback in production: without an
 * endpoint the flow surfaces a configuration error instead of pretending that
 * an attempt was stored.
 */
export function isDemoMode(): boolean {
  return (
    evaluationsEndpoint().status !== 'ready' &&
    env.NEXT_PUBLIC_DATA_MODE === 'mock' &&
    env.NEXT_PUBLIC_ENABLE_MOCKS
  );
}

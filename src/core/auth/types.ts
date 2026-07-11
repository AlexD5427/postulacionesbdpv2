import type { PersonIdentity } from '@/shared/types/domain';

/**
 * Provider-neutral auth types. The UI depends on these, never on a specific
 * auth SDK (e.g. Supabase Auth). Session tokens are handled by the provider
 * adapter; the public layer only sees the identity + a status.
 */
export interface AuthSession {
  identity: PersonIdentity;
  /** Coarse expiry hint for UX only; server is always authoritative. */
  expiresAt: string | null;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptDataProcessing: boolean;
  communicationOptIn: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

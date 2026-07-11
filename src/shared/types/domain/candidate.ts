import type { ISODateString, ProviderMetadata } from './common';

/**
 * Candidate identity & profile.
 *
 * `PersonIdentity` is deliberately broader than "candidate" so it can later
 * become the shared identity for employees, evaluators, etc. (see
 * FUTURE_HRIS_EVOLUTION.md) without a schema break.
 */
export interface PersonIdentity {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt: ISODateString;
}

export interface CandidateAccount {
  meta: ProviderMetadata;
  identity: PersonIdentity;
  status: 'active' | 'pending_verification' | 'disabled';
  /** Marketing/communication preference — separate from required processing. */
  communicationOptIn: boolean;
  dataProcessingConsentAt: ISODateString | null;
  lastLoginAt: ISODateString | null;
}

export interface CandidateContact {
  phone?: string;
  city?: string;
  country?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
}

export interface CandidatePreference {
  workModes: WorkMode[];
  employmentTypes: EmploymentType[];
  preferredAreas: string[];
  availability?: string;
  /** Optional and configurable; never used for public matching. */
  salaryExpectation?: { amount: number; currency: 'BOB' | 'USD'; period: 'month' | 'year' };
  openToRelocation: boolean;
}

export interface CandidateProfile {
  meta: ProviderMetadata;
  accountId: string;
  firstName: string;
  lastName: string;
  headline?: string;
  professionalSummary?: string;
  photoAssetId?: string;
  contact: CandidateContact;
  preferences: CandidatePreference;
  /** 0–100, based ONLY on profile completeness — never on job fit. */
  completionPercent: number;
  updatedAt: ISODateString;
}

export type WorkMode = 'on_site' | 'hybrid' | 'remote';
export type EmploymentType = 'full_time' | 'part_time' | 'temporary' | 'internship' | 'consultancy';
export type ExperienceLevel = 'entry' | 'junior' | 'mid' | 'senior' | 'lead';
export type ProficiencyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert' | 'native';

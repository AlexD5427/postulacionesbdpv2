import type { ISODateString, ProviderMetadata } from './common';
import type { ProficiencyLevel } from './candidate';

/**
 * Digital CV. Kept intentionally distinct from any future employee record —
 * the CV is candidate-authored content; an employee record is HR-authored.
 * See FUTURE_HRIS_EVOLUTION.md.
 */
export interface CandidateExperience {
  id: string;
  role: string;
  organization: string;
  location?: string;
  startDate: ISODateString;
  endDate: ISODateString | null; // null => current
  current: boolean;
  description?: string;
  order: number;
}

export interface CandidateEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: ISODateString;
  endDate?: ISODateString | null;
  inProgress: boolean;
  order: number;
}

export interface CandidateCertification {
  id: string;
  name: string;
  issuer: string;
  issuedDate?: ISODateString;
  expiryDate?: ISODateString | null;
  credentialUrl?: string;
  order: number;
}

export interface CandidateSkill {
  id: string;
  name: string;
  level: ProficiencyLevel;
  category: 'technical' | 'general';
  order: number;
}

export interface CandidateLanguage {
  id: string;
  name: string;
  level: ProficiencyLevel;
  order: number;
}

export interface CandidateReference {
  id: string;
  name: string;
  relationship: string;
  contact?: string;
  order: number;
}

export interface DigitalCV {
  meta: ProviderMetadata;
  accountId: string;
  professionalSummary?: string;
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  technicalSkills: CandidateSkill[];
  generalSkills: CandidateSkill[];
  languages: CandidateLanguage[];
  references: CandidateReference[];
  availability?: string;
  externalPortfolioUrl?: string;
  completionPercent: number;
  updatedAt: ISODateString;
}

export interface CoverLetter {
  meta: ProviderMetadata;
  accountId: string;
  title: string;
  /** Plain text in the MVP; future rich text via a restricted schema. */
  body: string;
  associatedJobId?: string;
  templateKey?: CoverLetterTemplateKey;
  isTemplate: boolean;
  updatedAt: ISODateString;
}

export type CoverLetterTemplateKey =
  | 'formal_banking'
  | 'customer_service'
  | 'commercial'
  | 'leadership'
  | 'analytical';

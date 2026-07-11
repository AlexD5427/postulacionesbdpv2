import type {
  CandidateAccount,
  CandidateProfile,
  DigitalCV,
  Notification,
  NotificationPreferences,
} from '@/shared/types/domain';
import { mockMeta } from './seed/meta';
import { uuid } from '@/shared/utils/ids';

/** Build a fresh candidate account for the mock provider. */
export function buildAccount(input: {
  firstName: string;
  lastName: string;
  email: string;
  communicationOptIn?: boolean;
}): CandidateAccount {
  const id = uuid();
  const now = new Date().toISOString();
  return {
    meta: mockMeta(id, `EXT-${id.slice(0, 8)}`),
    identity: {
      id,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email,
      emailVerified: false,
      createdAt: now,
    },
    status: 'pending_verification',
    communicationOptIn: input.communicationOptIn ?? false,
    dataProcessingConsentAt: now,
    lastLoginAt: now,
  };
}

export function buildProfile(account: CandidateAccount, firstName: string, lastName: string): CandidateProfile {
  const id = uuid();
  return {
    meta: mockMeta(id, `EXT-PROF-${id.slice(0, 8)}`),
    accountId: account.identity.id,
    firstName,
    lastName,
    contact: { country: 'Bolivia' },
    preferences: {
      workModes: [],
      employmentTypes: [],
      preferredAreas: [],
      openToRelocation: false,
    },
    completionPercent: 15,
    updatedAt: new Date().toISOString(),
  };
}

export function buildCV(account: CandidateAccount): DigitalCV {
  const id = uuid();
  return {
    meta: mockMeta(id, `EXT-CV-${id.slice(0, 8)}`),
    accountId: account.identity.id,
    experiences: [],
    education: [],
    certifications: [],
    technicalSkills: [],
    generalSkills: [],
    languages: [],
    references: [],
    completionPercent: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function buildDefaultNotificationPrefs(accountId: string): NotificationPreferences {
  return {
    accountId,
    channels: { email: true, inApp: true },
    categories: {
      account: true,
      application_receipt: true,
      assessment_invitation: true,
      interview_invitation: true,
      document_request: true,
      general: true,
      security: true,
      privacy: true,
    },
  };
}

/** Seed a couple of welcome notifications so the dashboard has content. */
export function buildWelcomeNotifications(accountId: string): Notification[] {
  const now = Date.now();
  return [
    {
      id: uuid(),
      accountId,
      category: 'account',
      title: 'Te damos la bienvenida al portal de talento del BDP',
      body: 'Completa tu perfil y tu CV para postular con un solo clic a nuestras convocatorias.',
      createdAt: new Date(now).toISOString(),
      read: false,
      actionRequired: false,
      link: '/candidate/profile',
    },
    {
      id: uuid(),
      accountId,
      category: 'privacy',
      title: 'Tu privacidad primero',
      body: 'Consulta cómo tratamos tus datos y qué controles tienes disponibles en cualquier momento.',
      createdAt: new Date(now - 60_000).toISOString(),
      read: true,
      actionRequired: false,
      link: '/privacy',
    },
  ];
}

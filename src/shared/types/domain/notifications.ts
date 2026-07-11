import type { ISODateString } from './common';

export type NotificationCategory =
  | 'account'
  | 'application_receipt'
  | 'assessment_invitation'
  | 'interview_invitation'
  | 'document_request'
  | 'general'
  | 'security'
  | 'privacy';

export interface Notification {
  id: string;
  accountId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: ISODateString;
  read: boolean;
  /** True only when the bank explicitly requires a candidate action. */
  actionRequired: boolean;
  /** Deep link to the associated job/application/assessment. */
  link?: string;
}

export interface NotificationPreferences {
  accountId: string;
  channels: { email: boolean; inApp: boolean };
  categories: Record<NotificationCategory, boolean>;
}

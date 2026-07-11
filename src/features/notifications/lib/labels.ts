import type { NotificationCategory } from '@/shared/types/domain';

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  account: 'Cuenta',
  application_receipt: 'Recepción de postulación',
  assessment_invitation: 'Invitación a evaluación',
  interview_invitation: 'Invitación a entrevista',
  document_request: 'Solicitud de documentos',
  general: 'Comunicación general',
  security: 'Seguridad',
  privacy: 'Privacidad',
};

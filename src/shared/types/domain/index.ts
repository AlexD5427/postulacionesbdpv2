/**
 * Public domain model barrel. Import domain entities from here.
 * NOTE: internal employment-decision entities (rank, fit score, stage,
 * interviewer notes, rejection reasons) are intentionally ABSENT — they must
 * never reach the public portal.
 */
export * from './common';
export * from './candidate';
export * from './cv';
export * from './media';
export * from './jobs';
export * from './applications';
export * from './assessments';
export * from './telemetry';
export * from './notifications';
export * from './accessibility';

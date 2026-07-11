import type {
  CandidateCertification,
  CandidateEducation,
  CandidateExperience,
  CandidateLanguage,
  CandidateReference,
  CandidateSkill,
} from '@/shared/types/domain';
import { uuid } from '@/shared/utils/ids';

export function newExperience(order: number): CandidateExperience {
  return {
    id: uuid(),
    role: '',
    organization: '',
    startDate: '',
    endDate: null,
    current: false,
    order,
  };
}

export function newEducation(order: number): CandidateEducation {
  return { id: uuid(), institution: '', degree: '', inProgress: false, order };
}

export function newCertification(order: number): CandidateCertification {
  return { id: uuid(), name: '', issuer: '', order };
}

export function newSkill(order: number, category: 'technical' | 'general'): CandidateSkill {
  return { id: uuid(), name: '', level: 'intermediate', category, order };
}

export function newLanguage(order: number): CandidateLanguage {
  return { id: uuid(), name: '', level: 'intermediate', order };
}

export function newReference(order: number): CandidateReference {
  return { id: uuid(), name: '', relationship: '', order };
}

/** Move an item within an ordered array and re-number `order`. */
export function moveItem<T extends { order: number }>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const a = next[index]!;
  const b = next[target]!;
  next[index] = b;
  next[target] = a;
  return next.map((item, i) => ({ ...item, order: i }));
}

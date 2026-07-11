import { formatDistanceToNow, format, isPast, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';

/** Format an ISO date as a Bolivian long date, e.g. "5 de marzo de 2026". */
export function formatLongDate(iso: string): string {
  return format(new Date(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy', { locale: es });
}

/** Relative label, e.g. "hace 3 días". */
export function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

export function isClosed(closesAt: string | null): boolean {
  if (!closesAt) return false;
  return isPast(new Date(closesAt));
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return differenceInCalendarDays(new Date(iso), new Date());
}

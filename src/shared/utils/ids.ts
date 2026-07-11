/**
 * ID helpers. Prefer the platform `crypto.randomUUID` when available (browser +
 * modern Node), with a safe fallback for older runtimes/tests.
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback (non-cryptographic; only used if randomUUID missing).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Short, human-friendly confirmation number, e.g. "BDP-8F3K2Q". */
export function confirmationNumber(prefix = 'BDP'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${out}`;
}

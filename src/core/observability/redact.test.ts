import { describe, expect, it } from 'vitest';
import { redact, coarseIp } from './redact';

describe('redact', () => {
  it('masks sensitive keys but keeps safe values', () => {
    const out = redact({
      email: 'a@b.com',
      password: 'secret',
      token: 'abc',
      cvContent: 'long text',
      answer: 'la respuesta',
      safe: 'ok',
      count: 3,
    }) as Record<string, unknown>;
    expect(out.email).toBe('«redacted»');
    expect(out.password).toBe('«redacted»');
    expect(out.token).toBe('«redacted»');
    expect(out.answer).toBe('«redacted»');
    expect(out.safe).toBe('ok');
    expect(out.count).toBe(3);
  });

  it('recurses into nested objects and arrays', () => {
    const out = redact({ nested: [{ apellido: 'X', ok: 1 }] }) as { nested: Array<Record<string, unknown>> };
    expect(out.nested[0]?.apellido).toBe('«redacted»');
    expect(out.nested[0]?.ok).toBe(1);
  });
});

describe('coarseIp', () => {
  it('masks the host portion of an IPv4 address', () => {
    expect(coarseIp('192.168.10.55')).toBe('192.168.x.x');
  });
  it('truncates IPv6 addresses', () => {
    expect(coarseIp('2001:db8:1234:5678::1')).toContain(':…');
  });
});

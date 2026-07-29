import { describe, expect, it } from 'vitest';
import { classifyEvaluationsEndpoint } from './endpoint';

/**
 * Endpoint classification.
 *
 * Each of these cases is a real mistake someone can make while configuring the
 * deployment; the point is that the module names the problem instead of failing
 * as a mysterious network error (the exact trap documented in the ATS repo's
 * `REPARACION_2026-07.md`).
 */
describe('classifyEvaluationsEndpoint', () => {
  it('accepts a production Web App URL', () => {
    const result = classifyEvaluationsEndpoint(
      'https://script.google.com/macros/s/AKfycbxxxx/exec',
    );
    expect(result.status).toBe('ready');
    expect(result.url).toBe('https://script.google.com/macros/s/AKfycbxxxx/exec');
  });

  it('accepts a /dev test deployment outside production', () => {
    expect(
      classifyEvaluationsEndpoint('https://script.google.com/macros/s/AK/dev', {
        production: false,
      }).status,
    ).toBe('ready');
  });

  it('rejects a /dev deployment in production', () => {
    // `/dev` serves unpublished code and demands a Google session, so a
    // candidate would receive Google's sign-in HTML instead of JSON.
    const result = classifyEvaluationsEndpoint('https://script.google.com/macros/s/AK/dev', {
      production: true,
    });
    expect(result.status).toBe('invalid');
    expect(result.url).toBe('');
    expect(result.diagnostic).toContain('/exec');
  });

  it('still accepts /exec in production', () => {
    expect(
      classifyEvaluationsEndpoint('https://script.google.com/macros/s/AK/exec', {
        production: true,
      }).status,
    ).toBe('ready');
  });

  it('reports a missing variable by name', () => {
    const result = classifyEvaluationsEndpoint('   ');
    expect(result.status).toBe('missing');
    expect(result.diagnostic).toContain('NEXT_PUBLIC_EVALUATIONS_APPS_SCRIPT_URL');
  });

  it('rejects a relative path (the classic copy/paste mistake)', () => {
    const result = classifyEvaluationsEndpoint('/api/evaluations');
    expect(result.status).toBe('invalid');
    expect(result.url).toBe('');
  });

  it('rejects http', () => {
    expect(classifyEvaluationsEndpoint('http://script.google.com/macros/s/AK/exec').status).toBe(
      'invalid',
    );
  });

  it('rejects an administrative URL so the public runner cannot point at it', () => {
    const result = classifyEvaluationsEndpoint('https://portal.example.com/api/evaluations/admin');
    expect(result.status).toBe('invalid');
    expect(result.diagnostic).toContain('administrativa');
  });

  it('rejects a URL that is not a deployment (missing /exec)', () => {
    const result = classifyEvaluationsEndpoint('https://script.google.com/home/projects/abc/edit');
    expect(result.status).toBe('invalid');
    expect(result.diagnostic).toContain('/exec');
  });
});

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { securityHeaders } from '@/core/security/headers.mjs';

/**
 * Static security guards for the public assessment module.
 *
 * These are cheap, boring tests that fail loudly if someone later reaches for a
 * shortcut: a server-only variable in the browser, raw HTML injection, a `fetch`
 * inside a component, or a CSP relaxed with a wildcard.
 */

const MODULE_DIRS = [
  'src/features/public-assessments',
  'src/infrastructure/evaluations',
  'src/app/(public)/evaluaciones',
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
  }
  return out;
}

const moduleFiles = MODULE_DIRS.flatMap(walk);
const sourceFiles = moduleFiles.filter((path) => !/\.test\.tsx?$/.test(path));

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('public assessment module — static security guards', () => {
  it('has files to inspect (guards the guard)', () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
  });

  it('reads no server-only environment variable', () => {
    const serverOnly = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'APPS_SCRIPT_SERVER_SECRET',
      'ARCHIVE_API_SERVER_TOKEN',
      'R2_SECRET_ACCESS_KEY',
      'EVALUATIONS_ADMIN_SHARED_SECRET',
    ];
    for (const path of sourceFiles) {
      const content = read(path);
      for (const name of serverOnly) {
        expect(content, `${path} references ${name}`).not.toContain(name);
      }
    }
  });

  it('never uses an administrative action of the Evaluations backend', () => {
    const adminActions = [
      'listAdminAssessments',
      'getAdminAssessment',
      'updateAssessment',
      'publishAssessment',
      'listAssessmentResults',
      'getAttemptDetail',
      'setupSchema',
    ];
    for (const path of sourceFiles) {
      const content = read(path);
      for (const action of adminActions) {
        expect(content, `${path} mentions ${action}`).not.toContain(action);
      }
    }
  });

  it('never injects HTML nor evaluates code', () => {
    for (const path of sourceFiles) {
      const content = read(path);
      expect(content, path).not.toContain('dangerouslySetInnerHTML');
      expect(content, path).not.toMatch(/\beval\s*\(/);
      expect(content, path).not.toContain('new Function(');
    }
  });

  it('does not require authentication anywhere in the flow', () => {
    for (const path of sourceFiles) {
      const content = read(path);
      expect(content, path).not.toContain('RequireAuth');
      expect(content, path).not.toContain('use-auth');
    }
  });

  it('keeps fetch out of components: only the transport talks HTTP', () => {
    const withFetch = sourceFiles.filter((path) => /\bfetch\(/.test(read(path)));
    expect(withFetch).toEqual(['src/infrastructure/evaluations/transport.ts']);
  });

  it('never imports a route handler from src/app/api', () => {
    for (const path of sourceFiles) {
      const content = read(path);
      expect(content, path).not.toMatch(/from\s+['"]@\/app\/api/);
      expect(content, path).not.toMatch(/from\s+['"][./]+app\/api/);
    }
  });

  it('never logs the participant, the document or the answers', () => {
    // The logger redacts by key name, but the module should not even try.
    for (const path of sourceFiles) {
      const content = read(path);
      expect(content, path).not.toMatch(/logger\.[a-z]+\([^)]*participant/);
      expect(content, path).not.toMatch(/logger\.[a-z]+\([^)]*answers/);
      expect(content, path).not.toMatch(/logger\.[a-z]+\([^)]*document/);
      expect(content, path).not.toMatch(/console\.log\(/);
    }
  });
});

describe('Content-Security-Policy', () => {
  const headers = securityHeaders();
  const csp = headers.find((header) => header.key === 'Content-Security-Policy')!.value;
  const connectSrc = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('connect-src'))!;

  it('allows the Apps Script Web App AND its redirect target', () => {
    // `/exec` answers 302 towards script.googleusercontent.com and CSP is
    // enforced on the redirect target too: both origins are required.
    expect(connectSrc).toContain('https://script.google.com');
    expect(connectSrc).toContain('https://script.googleusercontent.com');
  });

  it('does not widen connect-src with a Google wildcard', () => {
    expect(connectSrc).not.toContain('*.google.com');
    expect(connectSrc).not.toContain('*.googleusercontent.com');
    // No bare wildcard either; the only pre-existing wildcard is Supabase's.
    expect(connectSrc).not.toMatch(/(^|\s)\*($|\s)/);
  });

  it('keeps the dangerous sinks closed and powerful features denied', () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");

    const permissions = headers.find((header) => header.key === 'Permissions-Policy')!.value;
    expect(permissions).toContain('camera=()');
    expect(permissions).toContain('microphone=()');
    expect(permissions).toContain('geolocation=()');
  });
});

/**
 * next.config security headers tests (#198).
 *
 * The app shipped no security headers. This asserts the config emits CSP,
 * HSTS, X-Frame-Options, nosniff, Referrer-Policy, and Permissions-Policy,
 * and that the CSP allows the origins the app genuinely needs (Monaco CDN,
 * blob workers, cdnfonts, ws/wss).
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(__dirname, '..', '..');

async function loadConfig(): Promise<{
  headers?: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
}> {
  const mod = await import(pathToFileURL(path.join(root, 'next.config.ts')).href);
  return mod.default;
}

describe('next.config security headers', () => {
  it('defines an async headers() function (#198)', async () => {
    const config = await loadConfig();
    expect(typeof config.headers).toBe('function');
  });

  it('sets the core security headers on all routes (#198)', async () => {
    const config = await loadConfig();
    const rules = await config.headers!();
    const all = rules.find((r) => r.source === '/:path*');
    expect(all).toBeTruthy();

    const keys = Object.fromEntries(all!.headers.map((h) => [h.key, h.value]));
    expect(keys['Content-Security-Policy']).toBeTruthy();
    expect(keys['Strict-Transport-Security']).toContain('max-age=');
    expect(keys['X-Frame-Options']).toBe('DENY');
    expect(keys['X-Content-Type-Options']).toBe('nosniff');
    expect(keys['Referrer-Policy']).toBeTruthy();
    expect(keys['Permissions-Policy']).toBeTruthy();
  });

  it('CSP blocks framing and allows the resources the app needs (#198)', async () => {
    const config = await loadConfig();
    const rules = await config.headers!();
    const csp = rules[0].headers.find((h) => h.key === 'Content-Security-Policy')!.value;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    // Monaco workers.
    expect(csp).toContain('worker-src');
    expect(csp).toContain('blob:');
    // Fonts.
    expect(csp).toContain('fonts.cdnfonts.com');
    // WebSocket + Monaco CDN.
    expect(csp).toContain('connect-src');
    expect(csp).toContain('wss:');
  });
});
/**
 * docker-compose configuration tests (#195, #70).
 *
 * Guards the frontend/backend wiring:
 * - no obsolete top-level `version` key (#70);
 * - the frontend gets a server-reachable API URL for POST /api/sessions;
 * - the backend gets an ALLOWED_ORIGINS allowlist;
 * - no unused Supabase/App-URL env vars are injected into the frontend.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const compose = readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');

/** Extract the `environment:` block for a given service. */
function serviceEnv(service: string): string[] {
  const lines = compose.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^  ${service}:`).test(l));
  if (start === -1) return [];

  const env: string[] = [];
  let inEnv = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^  [a-z]/i.test(line)) break; // next service
    if (/^\s+environment:\s*$/.test(line)) {
      inEnv = true;
      continue;
    }
    if (inEnv) {
      const m = line.match(/^\s+-\s+([A-Z0-9_]+)=/);
      if (m) env.push(m[1]);
      else if (/^\s+[a-z]/i.test(line) && !/^\s+-/.test(line)) break;
    }
  }
  return env;
}

describe('docker-compose configuration', () => {
  it('omits the obsolete top-level version key (#70)', () => {
    expect(/^\s*version\s*:/m.test(compose)).toBe(false);
  });

  it('gives the frontend a server-reachable API URL (#195)', () => {
    const env = serviceEnv('frontend');
    expect(env).toContain('NEXT_PUBLIC_API_URL');
    expect(compose).toMatch(/NEXT_PUBLIC_API_URL=http:\/\/backend:8000/);
  });

  it('gives the backend an ALLOWED_ORIGINS allowlist (#195)', () => {
    const env = serviceEnv('backend');
    expect(env).toContain('ALLOWED_ORIGINS');
  });

  it('does not inject unused frontend env vars (#195)', () => {
    const env = serviceEnv('frontend');
    // The frontend never reads these.
    expect(env).not.toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(env).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(env).not.toContain('NEXT_PUBLIC_APP_URL');
  });

  it('still passes the required backend secrets', () => {
    const env = serviceEnv('backend');
    for (const required of [
      'GOOGLE_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_JWT_SECRET',
      'FASTAPI_ENV',
    ]) {
      expect(env).toContain(required);
    }
  });
});
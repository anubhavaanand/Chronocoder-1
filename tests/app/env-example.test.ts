/**
 * .env.example completeness test (#194).
 *
 * Every environment variable read by the backend or frontend must be
 * documented in .env.example so operators can discover the tuning/security
 * knobs.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

function readEnvExample(): string {
  return readFileSync(path.join(root, '.env.example'), 'utf8');
}

function collect(dir: string, exts: RegExp): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      out.push(...collect(full, exts));
    } else if (exts.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Extract env var names read via os.getenv("X") / process.env.X. */
function envVarsReadInCode(): Set<string> {
  const files = [
    ...collect(path.join(root, 'backend'), /\.py$/),
    ...collect(path.join(root, 'src'), /\.(ts|tsx)$/),
  ];
  const names = new Set<string>();
  const patterns = [
    /os\.getenv\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
    /os\.environ\.get\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) names.add(m[1]);
    }
  }
  return names;
}

describe('.env.example completeness', () => {
  it('documents every env var read in code (#194)', () => {
    const documented = readEnvExample();
    const missing: string[] = [];

    for (const name of envVarsReadInCode()) {
      // A var counts as documented if it appears as a KEY= line or in a comment.
      const keyLine = new RegExp(`^\\s*#?\\s*${name}\\s*=`, 'm');
      if (!keyLine.test(documented)) missing.push(name);
    }

    expect(missing).toEqual([]);
  });

  it('keeps the required secrets documented (#194)', () => {
    const documented = readEnvExample();
    for (const required of [
      'GOOGLE_API_KEY',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_JWT_SECRET',
      'NEXT_PUBLIC_WS_URL',
      'NEXT_PUBLIC_API_URL',
    ]) {
      expect(documented).toMatch(new RegExp(`^${required}\\s*=`, 'm'));
    }
  });
});
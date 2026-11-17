/**
 * package.json scripts regression tests.
 *
 * Covers:
 * - `start` must be compatible with `next.config.ts` `output: "standalone"`
 *   (#197): `next start` prints a warning and does not serve a standalone
 *   build, so the script must invoke the standalone server entrypoint.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

function readRootPackageJson(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
}

function readNextConfig(): string {
  return readFileSync(path.join(root, 'next.config.ts'), 'utf8');
}

describe('package.json scripts', () => {
  it('start script is compatible with output: standalone (#197)', () => {
    const pkg = readRootPackageJson();
    const scripts = pkg.scripts as Record<string, string>;
    const nextConfig = readNextConfig();

    const usesStandaloneOutput = /output\s*:\s*["']standalone["']/.test(nextConfig);

    expect(scripts.start).toBeTruthy();

    if (usesStandaloneOutput) {
      // `next start` is incompatible with standalone output; the script must
      // run the standalone server bundle produced by `next build`.
      expect(scripts.start).not.toContain('next start');
      expect(scripts.start).toContain('.next/standalone/server.js');
    }
  });
});
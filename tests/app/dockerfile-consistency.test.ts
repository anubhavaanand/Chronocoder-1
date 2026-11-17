/**
 * Dockerfile consistency test (#196).
 *
 * The root `Dockerfile` (used by Render/Railway) and
 * `docker/Dockerfile.frontend` (used by compose/fly/CI) must stay in sync so
 * the two never drift into different build steps.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

/** Strip comments/blank lines and whitespace-normalize each line. */
function normalize(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    // Ignore label lines (they legitimately differ between files).
    .filter((l) => !l.startsWith('LABEL '));
}

describe('Dockerfile consistency', () => {
  const rootDf = readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  const dockerDf = readFileSync(path.join(root, 'docker', 'Dockerfile.frontend'), 'utf8');

  it('root Dockerfile and docker/Dockerfile.frontend define the same build steps (#196)', () => {
    expect(normalize(rootDf)).toEqual(normalize(dockerDf));
  });

  it('both enable a healthcheck against /health (#196)', () => {
    for (const [name, text] of [
      ['Dockerfile', rootDf],
      ['docker/Dockerfile.frontend', dockerDf],
    ] as const) {
      expect(text).toMatch(/HEALTHCHECK/);
      expect(text).toMatch(/\/health/);
    }
  });

  it('both copy the standalone server output (#196)', () => {
    for (const text of [rootDf, dockerDf]) {
      expect(text).toMatch(/\.next\/standalone/);
      expect(text).toMatch(/CMD \["node", "server\.js"\]/);
    }
  });
});
/**
 * package.json metadata tests (#193).
 *
 * The package was missing standard npm metadata (engines, license,
 * repository, bugs, description, author) and had no `.nvmrc`, so contributors
 * got no engine enforcement and tooling had nothing to link back to.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

function pkg(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
}

describe('package.json metadata', () => {
  it('declares engines.node (#193)', () => {
    const engines = pkg().engines as Record<string, string> | undefined;
    expect(engines).toBeTruthy();
    expect(engines!.node).toMatch(/>=?\s*\d+/);
  });

  it('declares license MIT (#193)', () => {
    expect(pkg().license).toBe('MIT');
  });

  it('declares repository, bugs, homepage, description, and author (#193)', () => {
    const p = pkg();
    expect(p.repository).toBeTruthy();
    expect(p.bugs).toBeTruthy();
    expect(p.homepage).toBeTruthy();
    expect(typeof p.description).toBe('string');
    expect((p.description as string).length).toBeGreaterThan(0);
    expect(p.author).toBeTruthy();
  });

  it('ships an .nvmrc (#193)', () => {
    const nvmrcPath = path.join(root, '.nvmrc');
    expect(existsSync(nvmrcPath)).toBe(true);
    const contents = readFileSync(nvmrcPath, 'utf8').trim();
    expect(contents).toMatch(/^\d+/);
  });
});
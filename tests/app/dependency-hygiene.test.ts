/**
 * package.json dependency hygiene tests.
 *
 * Guards against re-declaring runtime dependencies that no source file imports
 * (#192): axios, @tanstack/react-query, tailwind-merge, and prettier were all
 * listed as dependencies but used nowhere in src/.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const srcDir = path.join(root, 'src');

function readRootPackageJson(): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
}

/** Recursively collect source file paths under src/. */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function sourceText(): string {
  return collectSourceFiles(srcDir)
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
}

describe('package.json dependency hygiene', () => {
  const pkg = readRootPackageJson();
  const declared = Object.keys(pkg.dependencies ?? {});

  // Known packages that are intentionally unused and must not creep back in.
  const banned = ['axios', '@tanstack/react-query', 'tailwind-merge', 'prettier'];

  it('does not declare the previously-removed unused dependencies (#192)', () => {
    const offenders = banned.filter((name) => declared.includes(name));
    expect(offenders).toEqual([]);
  });

  // Packages that are legitimately not imported by name in src/:
  // - @tailwindcss/postcss: used by postcss.config.mjs at build time
  // - react-dom: required implicitly by Next.js/React at runtime
  const allowlist = new Set(['@tailwindcss/postcss', 'react-dom']);

  it('every declared dependency is imported somewhere in src/', () => {
    const src = sourceText();
    const unused: string[] = [];

    for (const name of declared) {
      if (allowlist.has(name)) continue;

      // Match `from 'name'`, `from "name"`, `import('name')`, or `require('name')`,
      // including subpath imports like `name/xyz`.
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:from\\s*|import\\s*\\(\\s*|require\\s*\\(\\s*)['"]${escaped}(?:/[^'"]*)?['"]`);
      if (!re.test(src)) {
        unused.push(name);
      }
    }

    expect(unused).toEqual([]);
  });
});
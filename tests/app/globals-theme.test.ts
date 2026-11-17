/**
 * globals.css theme token tests.
 *
 * Guards against self-referential `@theme inline` variables (#202): a theme
 * token whose value is `var(<same-name>)` is a circular reference that
 * resolves unpredictably in Tailwind v4. Font and shadow tokens must inline
 * their literal values (matching :root) instead.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const css = readFileSync(path.join(root, 'src', 'app', 'globals.css'), 'utf8');

/** Extract the body of the `@theme inline { ... }` block. */
function themeBlock(source: string): string {
  const match = source.match(/@theme\s+inline\s*\{([\s\S]*?)\n\}/);
  if (!match) throw new Error('Could not find @theme inline block in globals.css');
  return match[1];
}

/** Parse `--name: value;` pairs from a CSS block. */
function parseDeclarations(block: string): Record<string, string> {
  const decls: Record<string, string> = {};
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    decls[m[1]] = m[2].trim();
  }
  return decls;
}

describe('globals.css @theme inline tokens', () => {
  const theme = parseDeclarations(themeBlock(css));

  it('has no self-referential custom properties (#202)', () => {
    const offenders: string[] = [];
    for (const [name, value] of Object.entries(theme)) {
      // A self-reference looks like `var(--name)` or `var( --name )`.
      const selfRef = new RegExp(`var\\(\\s*${name.replace(/[-]/g, '\\-')}\\s*\\)`);
      if (selfRef.test(value)) {
        offenders.push(`${name}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('font tokens resolve to real font stacks, not var() self-references (#202)', () => {
    expect(theme['--font-sans']).toBeTruthy();
    expect(theme['--font-sans']).not.toMatch(/^var\(/);
    expect(theme['--font-mono']).toBeTruthy();
    expect(theme['--font-mono']).not.toMatch(/^var\(/);
    expect(theme['--font-display']).toBeTruthy();
    expect(theme['--font-display']).not.toMatch(/^var\(/);

    // The sans stack should still include a generic fallback.
    expect(theme['--font-sans']).toMatch(/sans-serif/);
    expect(theme['--font-mono']).toMatch(/monospace/);
  });

  it('shadow tokens are inlined, not var() self-references (#202)', () => {
    expect(theme['--shadow-neon']).toBeTruthy();
    expect(theme['--shadow-neon']).not.toMatch(/^var\(/);
    expect(theme['--shadow-card']).toBeTruthy();
    expect(theme['--shadow-card']).not.toMatch(/^var\(/);
    expect(theme['--shadow-glow']).toBeTruthy();
    expect(theme['--shadow-glow']).not.toMatch(/^var\(/);
  });
});
describe('globals.css reduced-motion handling (#314)', () => {
  const reducedMotionBlock = css.match(
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/
  )?.[1];

  it('disables smooth scrolling under prefers-reduced-motion (#314)', () => {
    expect(reducedMotionBlock).toBeTruthy();
    // `html { scroll-behavior: auto; }` must appear inside the media query.
    expect(reducedMotionBlock).toMatch(/html\s*\{[^}]*scroll-behavior\s*:\s*auto/);
  });

  it('still disables the decorative CSS animations (#314)', () => {
    expect(reducedMotionBlock).toMatch(/\.animate-float/);
    expect(reducedMotionBlock).toMatch(/animation\s*:\s*none/);
  });
});

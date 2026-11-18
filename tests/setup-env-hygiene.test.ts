/**
 * Test-environment hygiene (#229).
 *
 * `tests/setup.ts` used to assign `process.env.NODE_ENV` through a cast:
 *
 *     (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
 *
 * That bypassed the type-checker, and vitest only reverts env vars at the end
 * of a file — so a test that overwrote one leaked the new value into every
 * later test in the same worker.
 *
 * The fix is `unstubEnvs: true` in `vitest.config.ts`, which makes vitest
 * restore stubbed values after *each* test. These cases pin both halves of
 * that: an overwrite is visible where it happens, and is gone by the next test.
 */

import { describe, it, expect, vi } from 'vitest';

describe('test env hygiene (#229)', () => {

  it('runs with NODE_ENV=test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('exposes the NEXT_PUBLIC vars the app reads', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();
    expect(process.env.NEXT_PUBLIC_GEMINI_API_KEY).toBeTruthy();
  });

  it('does not leak a per-test NODE_ENV overwrite into the next test', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(process.env.NODE_ENV).toBe('production');
  });

  it('sees NODE_ENV restored to test after the overwrite', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('does not leak a per-test NEXT_PUBLIC overwrite either', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://leaked.example.com');
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://leaked.example.com');
  });

  it('sees the original NEXT_PUBLIC_SUPABASE_URL restored', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
  });
});
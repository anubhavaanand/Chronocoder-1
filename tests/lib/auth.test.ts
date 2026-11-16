/**
 * Unit tests for client auth utilities (#CC-046).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getStoredAuthToken, getAuthHeaders, AUTH_TOKEN_KEYS } from '../../src/lib/auth';

describe('Auth Utilities (#CC-046)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns null and empty headers when no token is present', () => {
    expect(getStoredAuthToken()).toBeNull();
    expect(getAuthHeaders()).toEqual({});
  });

  it('retrieves raw JWT token from chrono_auth_token in localStorage', () => {
    localStorage.setItem('chrono_auth_token', 'jwt.test.token');
    expect(getStoredAuthToken()).toBe('jwt.test.token');
    expect(getAuthHeaders()).toEqual({
      Authorization: 'Bearer jwt.test.token',
    });
  });

  it('retrieves raw JWT token from sb-access-token in sessionStorage', () => {
    sessionStorage.setItem('sb-access-token', 'supabase.session.token');
    expect(getStoredAuthToken()).toBe('supabase.session.token');
    expect(getAuthHeaders()).toEqual({
      Authorization: 'Bearer supabase.session.token',
    });
  });

  it('parses JSON stringified Supabase session object', () => {
    const sessionObj = JSON.stringify({
      access_token: 'nested.supabase.jwt',
      token_type: 'bearer',
    });
    localStorage.setItem('supabase.auth.token', sessionObj);
    expect(getStoredAuthToken()).toBe('nested.supabase.jwt');
    expect(getAuthHeaders()).toEqual({
      Authorization: 'Bearer nested.supabase.jwt',
    });
  });

  it('preserves existing Bearer prefix if already included', () => {
    localStorage.setItem('chrono_auth_token', 'Bearer prefixed.token.value');
    expect(getStoredAuthToken()).toBe('Bearer prefixed.token.value');
    expect(getAuthHeaders()).toEqual({
      Authorization: 'Bearer prefixed.token.value',
    });
  });
});

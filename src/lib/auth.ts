/**
 * Authentication token utilities for client-side API calls (#CC-046).
 *
 * Supports retrieving tokens from standard storage locations (localStorage /
 * sessionStorage) for authenticated backend endpoints, such as session
 * persistence and feedback history.
 */

export const AUTH_TOKEN_KEYS = [
  "chrono_auth_token",
  "sb-access-token",
  "supabase_token",
  "supabase.auth.token",
] as const;

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    for (const key of AUTH_TOKEN_KEYS) {
      const token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token && token.trim()) {
        // If stored as JSON object (e.g. Supabase session object)
        if (token.startsWith("{")) {
          try {
            const parsed = JSON.parse(token);
            const extracted = parsed?.access_token || parsed?.token || parsed?.currentSession?.access_token;
            if (extracted && typeof extracted === "string") {
              return extracted.trim();
            }
          } catch {
            // Ignore JSON parse errors and continue
          }
        }
        return token.trim();
      }
    }
  } catch {
    // Cross-origin / disabled storage fallback
    return null;
  }

  return null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredAuthToken();
  if (!token) return {};

  return {
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
}

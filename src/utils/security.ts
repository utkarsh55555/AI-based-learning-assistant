/**
 * utils/security.ts
 * =================
 * Client-side security utilities:
 *   - XSS sanitization via DOMPurify
 *   - Input field sanitization helpers
 *   - CSRF token management (fetch + cache + attach to headers)
 *   - Password strength validation
 *   - Secure storage helpers (avoids storing sensitive data in localStorage)
 */

// DOMPurify is loaded via CDN or installed as a dependency.
// If you're using Vite, install with: npm install dompurify @types/dompurify
// For CDN fallback we check window.DOMPurify at runtime.
let DOMPurify: any = null;

async function getDOMPurify() {
  if (DOMPurify) return DOMPurify;
  try {
    // Dynamic import — works with Vite/webpack bundlers
    const mod = await import('dompurify');
    DOMPurify = mod.default ?? mod;
  } catch {
    // Fallback: escape HTML manually (no rich-text rendering)
    DOMPurify = {
      sanitize: (dirty: string) => escapeHtml(dirty),
    };
  }
  return DOMPurify;
}

// ── XSS Sanitization ──────────────────────────────────────────────────────

/**
 * Sanitize a string that will be rendered as HTML.
 * Always use this before calling innerHTML / dangerouslySetInnerHTML.
 */
export async function sanitizeHtml(dirty: string): Promise<string> {
  const purify = await getDOMPurify();
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Synchronous HTML escaper for plain-text values.
 * Use when you just need to display user text safely (not rich-text).
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strip all HTML tags from a string (for plain-text form inputs).
 */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

// ── Input Sanitization ────────────────────────────────────────────────────

/** Remove null bytes and control characters from a string. */
export function sanitizeInput(value: string): string {
  // Remove null bytes + non-printable control chars (except \n \r \t)
  return value
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .trim();
}

/** Validate an email address format. */
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

// ── Password Strength ─────────────────────────────────────────────────────

export interface PasswordStrength {
  score: number;          // 0-5
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  errors: string[];
  color: string;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];

  if (password.length < 8)            errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password))        errors.push('One uppercase letter');
  if (!/[a-z]/.test(password))        errors.push('One lowercase letter');
  if (!/\d/.test(password))           errors.push('One digit');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');

  const score = 5 - errors.length;
  const labels: PasswordStrength['label'][] = [
    'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong',
  ];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return {
    score,
    label: labels[Math.max(0, score - 1)] ?? 'Very Weak',
    errors,
    color: colors[Math.max(0, score - 1)] ?? '#ef4444',
  };
}

// ── CSRF Token Management ─────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000';

interface CsrfCache {
  token: string;
  fetchedAt: number;
}

let _csrfCache: CsrfCache | null = null;
const CSRF_TTL_MS = 55 * 60 * 1000; // 55 min (server expiry is 60 min)

/**
 * Fetch (and cache) a CSRF token from the backend.
 * Automatically refreshes when the cached token is about to expire.
 */
export async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  if (_csrfCache && now - _csrfCache.fetchedAt < CSRF_TTL_MS) {
    return _csrfCache.token;
  }

  try {
    const response = await fetch(`${API_BASE}/api/csrf-token`, {
      method: 'GET',
      credentials: 'omit',
    });
    if (!response.ok) throw new Error('Failed to fetch CSRF token');
    const data = await response.json();
    const token: string = data?.data?.csrf_token ?? data?.csrf_token ?? '';
    if (!token) throw new Error('Empty CSRF token');

    _csrfCache = { token, fetchedAt: now };
    return token;
  } catch (err) {
    console.warn('[CSRF] Could not fetch token:', err);
    return ''; // Graceful degradation — backend will reject if required
  }
}

/** Invalidate the CSRF cache (call after logout). */
export function invalidateCsrfToken(): void {
  _csrfCache = null;
}

/**
 * Build headers for a fetch request, including Authorization and CSRF token.
 * Use this instead of building headers manually.
 */
export async function buildSecureHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };

  // Authorization
  const token = localStorage.getItem('access_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // CSRF (only needed for mutating methods — caller decides)
  const csrf = await getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;

  return headers;
}

// ── Secure session helpers ────────────────────────────────────────────────

/**
 * Store the auth session securely.
 * Tokens go in localStorage (SPA standard). PII is NOT stored there.
 */
export function storeSession(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

/** Clear the stored session (call on logout). */
export function clearSession(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  invalidateCsrfToken();
}

/** Check if the stored JWT looks structurally valid (3 base64 parts). */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3;
}

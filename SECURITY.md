# Obsidian AI — Security Implementation Guide

> **Status**: Implemented ✅ | Last updated: 2026-06-22

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication & Access Control](#1-authentication--access-control)
3. [Input & Data Protection](#2-input--data-protection)
4. [API & Network Security](#3-api--network-security)
5. [Database & Storage Security](#4-database--storage-security)
6. [Operational Security](#5-operational-security)
7. [How to Rotate Secrets](#how-to-rotate-secrets)
8. [Production Hardening Checklist](#production-hardening-checklist)

---

## Architecture Overview

```
React (Vite/TypeScript)
  └── utils/security.ts          ← DOMPurify, CSRF token, pw strength, clearSession
  └── utils/api.ts               ← Auto-attaches Authorization + X-CSRF-Token
  └── components/LoginScreen.tsx ← Client-side lockout UX, pw strength bar
  └── index.html                 ← CSP meta, X-Frame-Options, nosniff

Flask (Python)
  └── app.py                     ← Talisman, CORS whitelist, Limiter, CSRF, sanitizer
  └── config/settings.py         ← All security env-vars with defaults
  └── middlewares/
  │     auth_middleware.py       ← Supabase JWT + server-side expiry + RBAC helper
  │     rate_limiter.py          ← Flask-Limiter (login/signup/api/ws limits)
  │     rbac.py                  ← Role-based access control decorators
  │     csrf_middleware.py       ← HMAC-SHA256 stateless CSRF tokens
  │     audit_logger.py          ← JSON-line audit log → file + stdout
  │     input_sanitizer.py       ← Before-request HTML/XSS sanitizer
  │     error_handler.py         ← No stack traces in production
  └── utils/
        lockout.py               ← In-memory account lockout (5 attempts / 15 min)
        sanitize.py              ← bleach wrapper + password strength validator

Database: Supabase (PostgreSQL with RLS)
```

---

## 1. Authentication & Access Control

### JWT Strengthening
- **File**: `middlewares/auth_middleware.py`
- Supabase handles JWT signing and verification
- Additional server-side session expiry (`JWT_EXPIRY_SECONDS`, default 1h) on top of JWT `exp`
- Strict `Bearer <token>` parsing — rejects malformed Authorization headers
- Tokens validated on **every request** via `require_auth` decorator

### Account Lockout
- **File**: `utils/lockout.py`
- 5 consecutive failures → 15-minute lockout (configurable via `.env`)
- Lockout check happens **before** Supabase is queried (saves API calls)
- Counter reset on successful login
- Frontend mirrors remaining seconds with a countdown timer
- Swap storage to Redis for multi-process deployments

### Role-Based Access Control (RBAC)
- **File**: `middlewares/rbac.py`
- 4-level hierarchy: `guest` → `student` → `teacher` → `admin`
- Two decorators:
  ```python
  @require_role('admin')                 # exact role match
  @require_minimum_role('teacher')       # teacher or above
  ```
- Role is read from Supabase `app_metadata.role` (server-trusted, not user-editable)
- Falls back to `user_metadata.role`, then to the loaded user profile

---

## 2. Input & Data Protection

### XSS Protection — Server
- **File**: `middlewares/input_sanitizer.py` + `utils/sanitize.py`
- `before_request` hook intercepts every JSON body
- All string values are passed through `bleach.clean()` (strips all HTML tags)
- Rich-text fields (`content`, `description`, `body`) allow a minimal safe whitelist
- Control characters (null bytes, non-printable) stripped from all strings

### XSS Protection — Client
- **File**: `src/utils/security.ts`
- `sanitizeHtml(dirty)` — async DOMPurify wrapper with a strict tag whitelist
- `stripHtml(value)` — synchronous tag stripper for plain-text inputs
- `sanitizeInput(value)` — strips control chars + whitespace
- Login/signup forms sanitize email and name before sending to the API

### CSRF Protection
- **File**: `middlewares/csrf_middleware.py`
- Stateless HMAC-SHA256 tokens: `{timestamp}:{nonce}:{signature}`
- Token issued via `GET /api/csrf-token`, cached by the frontend for 55 min
- All `POST / PUT / PATCH / DELETE` requests must include `X-CSRF-Token` header
- Login and signup are `@csrf.exempt` (they issue the initial session, not post-auth)
- Frontend (`utils/security.ts`) auto-fetches and attaches tokens via `getCsrfToken()`

### Input Validation
- **File**: `utils/sanitize.py` (server) + `utils/security.ts` (client)
- Password strength requirements (8+ chars, upper, lower, digit, special)
- Enforced on both client (UX) and server (API response 400)
- Email format validated with regex on both sides

---

## 3. API & Network Security

### Rate Limiting
- **File**: `middlewares/rate_limiter.py`
- Login: **5 requests / minute** per IP
- Signup: **3 requests / minute** per IP
- All API routes: **120 requests / minute** per IP (default)
- WebSocket events: **30 events / minute**
- Returns JSON `429` on breach (no default HTML page)
- Storage: in-memory (dev) or Redis (production via `RATE_LIMIT_STORAGE_URI`)

### CORS
- **File**: `app.py`
- Restricted to an explicit origins list (`CORS_ORIGINS` in `.env`)
- Wildcard `*` only allowed in local development
- Exposes `Content-Type`, `Authorization`, `X-CSRF-Token` — nothing else
- `supports_credentials=False` (no cookies, Bearer-token-only)

### Security Headers (Flask-Talisman)
- **File**: `app.py`

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Restricts scripts/styles/connects to known origins |
| `Strict-Transport-Security` | `max-age=31536000` (1 year HSTS) |
| `X-Frame-Options` | `DENY` (clickjacking protection) |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | geolocation, microphone, camera, payment all `none` |

### HTTPS / TLS
- Set `FORCE_HTTPS=True` in `.env` when deployed behind a TLS proxy (Render, Railway, nginx)
- HSTS header is sent even in dev (browser will enforce HTTPS after first visit)

---

## 4. Database & Storage Security

### Password Hashing
- Handled entirely by **Supabase Auth** (bcrypt under the hood)
- Passwords are **never stored or logged** by this application layer

### Field Encryption
- `FIELD_ENCRYPTION_KEY` in `.env` accepts a Fernet key
- Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- Apply to sensitive profile fields (e.g., phone numbers) using `cryptography.fernet.Fernet`

### Least Privilege (Supabase RLS)
- Anon key (public client): can only read/write data allowed by RLS policies
- Service key (admin client): used only server-side for initial profile creation
- RLS policies ensure users can only access their own data

### Audit Logging
- **File**: `middlewares/audit_logger.py`
- JSON-line log written to `AUDIT_LOG_FILE` (default `audit.log`)
- Events logged: `SIGNUP`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ACCOUNT_LOCKED`, `LOGOUT`
- All 401/403/429 responses auto-logged as `SUSPICIOUS_REQUEST` (via after_request hook)
- Sensitive fields (`password`, `token`, `secret`, `key`) automatically redacted

---

## 5. Operational Security

### Error Handling
- **File**: `middlewares/error_handler.py`
- In **production** (`FLASK_DEBUG=False`): generic messages only — no exception types, no paths, no stack traces
- In **development**: full traceback to server console only, never to HTTP response
- Handlers registered for 400, 401, 403, 404, 405, 429, 500 + catch-all Exception

### Environment Variables
- All secrets live in `.env` which is **git-ignored**
- `settings.validate()` prints `[SECURITY WARNING]` if default/weak values detected
- Never use `dev-secret-key-change-in-production` in production — validation will warn

### Monitoring
- `audit.log` is the primary security event stream
- Every 401/403/429 triggers an audit entry with IP + path
- Structured JSON format — easily ingested by Datadog, Splunk, ELK, etc.

### Content Security Policy (Frontend)
- **File**: `src/index.html`
- CSP meta tag as defence-in-depth (production CSP from Talisman headers takes precedence)
- `frame-ancestors 'none'` — prevents embedding in iframes
- `X-Frame-Options: DENY` meta tag reinforces this

---

## How to Rotate Secrets

```bash
# Generate a new SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate a new CSRF_SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate a new FIELD_ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Update the values in `.env` and restart the server. CSRF tokens will be re-issued automatically.

---

## Production Hardening Checklist

- [ ] Set `FLASK_DEBUG=False` and `FLASK_ENV=production`
- [ ] Set `FORCE_HTTPS=True`
- [ ] Replace `SECRET_KEY` and `CSRF_SECRET_KEY` with generated values
- [ ] Set `CORS_ORIGINS` to your actual frontend domain(s) only
- [ ] Set `RATE_LIMIT_STORAGE_URI=redis://...` for multi-process deployments
- [ ] Generate and set `FIELD_ENCRYPTION_KEY` if storing sensitive PII
- [ ] Configure `AUDIT_LOG_FILE` to a persistent volume path
- [ ] Deploy behind nginx/Caddy/cloud load balancer for TLS termination
- [ ] Rotate Supabase service key regularly
- [ ] Enable Supabase Row Level Security (RLS) on all tables
- [ ] Set up log alerting (e.g., PagerDuty) on `ACCOUNT_LOCKED` audit events

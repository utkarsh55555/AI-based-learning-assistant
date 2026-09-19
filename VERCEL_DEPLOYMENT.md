# 🚀 Vercel Deployment Guide

## Architecture on Vercel

```
┌─────────────────────────────────┐
│         Vercel Edge             │
│                                 │
│  ┌─────────────┐  ┌──────────┐ │
│  │   React SPA │  │  Flask   │ │
│  │  (Static)   │  │ (Python  │ │
│  │  /build     │  │Serverless│ │
│  │             │  │  /api/*  │ │
│  └─────────────┘  └──────────┘ │
└─────────────────────────────────┘
```

- **Frontend**: Vite + React → deployed as static files from `build/`
- **Backend**: Flask → deployed as a Python Serverless Function at `api/index.py`
- **Routing**: `/api/*` → Flask function, everything else → React SPA

---

## Step 1: Push to GitHub

Make sure your project is in a GitHub repository:

```bash
git add .
git commit -m "feat: add Vercel deployment configuration"
git push origin main
```

---

## Step 2: Import Project on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Vercel will auto-detect the `vercel.json` config

**Build Settings** (auto-filled from `vercel.json`):
| Setting | Value |
|---|---|
| Framework Preset | Other |
| Build Command | `npm run build` |
| Output Directory | `build` |
| Install Command | `npm install` |

---

## Step 3: Set Environment Variables

In the Vercel dashboard → **Settings → Environment Variables**, add ALL of these:

### 🔑 Required Variables

| Variable | Description | Example |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | `sb_publishable_...` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `sb_secret_...` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `SECRET_KEY` | Flask secret key (32+ chars) | Generate below |
| `CSRF_SECRET_KEY` | CSRF signing key (32+ chars) | Generate below |
| `CORS_ORIGINS` | Your Vercel domain | `https://your-app.vercel.app` |
| `VITE_API_URL` | Same as CORS_ORIGINS | `https://your-app.vercel.app` |

### ⚙️ Configuration Variables

| Variable | Value for Production |
|---|---|
| `FLASK_ENV` | `production` |
| `FLASK_DEBUG` | `False` |
| `FORCE_HTTPS` | `True` |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` |
| `RATE_LIMIT_STORAGE_URI` | `memory://` |
| `RATE_LIMIT_LOGIN` | `5 per minute` |
| `RATE_LIMIT_SIGNUP` | `3 per minute` |
| `RATE_LIMIT_API` | `120 per minute` |
| `LOCKOUT_MAX_ATTEMPTS` | `5` |
| `LOCKOUT_DURATION_SECONDS` | `900` |
| `JWT_EXPIRY_SECONDS` | `3600` |
| `CSRF_TOKEN_EXPIRY_SECONDS` | `3600` |

### 🔐 Generating Secret Keys

Run this in your terminal:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Generate two different values — one for `SECRET_KEY` and one for `CSRF_SECRET_KEY`.

---

## Step 4: Deploy

Click **Deploy**. Vercel will:
1. Run `npm install` → install Node packages
2. Run `npm run build` → build the React app to `build/`
3. Bundle `api/index.py` → create Python serverless function

---

## Step 5: Update CORS After Deploy

After your first deploy, you'll get a URL like `https://ai-learning-assistant-xxxx.vercel.app`.

Go back to Vercel **Environment Variables** and update:
- `CORS_ORIGINS` → `https://ai-learning-assistant-xxxx.vercel.app`
- `VITE_API_URL` → `https://ai-learning-assistant-xxxx.vercel.app`

Then **Redeploy** (Deployments → ⋮ → Redeploy).

---

## Step 6: Verify Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.vercel.app/health

# API connectivity
curl https://your-app.vercel.app/api/test
```

Both should return JSON `{"status": "healthy/ok"}`.

---

## ⚠️ Known Vercel Limitations

| Issue | Notes |
|---|---|
| **Rate Limiter** | `memory://` storage resets per function invocation — use Redis for strict limits |
| **Audit Log File** | `/audit.log` won't persist — logs go to Vercel's function logs instead |
| **Cold Starts** | Python functions may have ~1–2s cold start on first request |
| **Execution Timeout** | Free tier: 10s max; Pro: 60s max per API call |

### Redis (Optional, for persistent rate limiting)

If you want Redis for rate limiting, add:
```
RATE_LIMIT_STORAGE_URI=redis://your-redis-url:6379
```

Services: [Upstash Redis](https://upstash.com/) has a free Vercel integration.

---

## Local Development (Unchanged)

```bash
# Start frontend + backend together
npm run start

# Or separately:
npm run dev           # Frontend on :3000
npm run backend:win   # Backend on :5000
```

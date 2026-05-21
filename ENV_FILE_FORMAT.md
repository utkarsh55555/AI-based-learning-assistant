# 📝 .env File Format Guide

## ⚠️ Important: Your `.env` files must follow this exact format

### Backend `.env` file location:
`src/obsidian-backend-flask/.env`

### Format:
```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
SUPABASE_URL=https://qynxwqzmalrwzgypjtjb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5bnh3cXptYWxyd3pneXBqdGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDgwMzYsImV4cCI6MjA3NjEyNDAzNn0.7G61dySmX3MO-y6fiIQpDRj-MVw8nJJWp_RqxQVxRUU
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5bnh3cXptYWxyd3pneXBqdGpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU0ODAzNiwiZXhwIjoyMDc2MTI0MDM2fQ.SKUT2-qy5hHcfQ09jzhdedCQwjvOjGf047Iyu1NkVhU

# ============================================
# OPENAI API CONFIGURATION
# ============================================

# ============================================
# FLASK CONFIGURATION
# ============================================
SECRET_KEY=dev-secret-key-change-in-production-please-use-a-secure-random-string
FLASK_ENV=development
FLASK_DEBUG=True

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=5000
HOST=0.0.0.0

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ORIGINS=*
```

### Frontend `.env` file location:
`.env` (root directory)

### Format:
```env
# ============================================
# FRONTEND ENVIRONMENT VARIABLES
# ============================================
VITE_API_URL=http://localhost:5000
```

## ✅ Key Points:

1. **NO QUOTES** - Don't wrap values in quotes
2. **NO SPACES** - No spaces around the `=` sign
3. **EXACT VARIABLE NAMES** - Use exact variable names shown above
4. **ONE PER LINE** - Each variable on its own line

## ❌ Wrong Format Examples:

```env
# ❌ WRONG - Don't use quotes
SUPABASE_URL="https://qynxwqzmalrwzgypjtjb.supabase.co"

# ❌ WRONG - No spaces around =
SUPABASE_URL = https://qynxwqzmalrwzgypjtjb.supabase.co

# ❌ WRONG - Wrong variable name
SUPABASE_URL=https://qynxwqzmalrwzgypjtjb.supabase.co
SUPABASE_ANON_KEY=...
```

## ✅ Correct Format:

```env
# ✅ CORRECT
SUPABASE_URL=https://qynxwqzmalrwzgypjtjb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔍 Verify Your .env Files:

1. Check that both `.env` files exist:
   - `src/obsidian-backend-flask/.env`
   - `.env` (root)

2. Verify format matches above (no quotes, no spaces around =)

3. Make sure all required variables are present

4. Restart your backend server after making changes


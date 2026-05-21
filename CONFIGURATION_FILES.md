# 🔧 Configuration Files - Complete Guide

This document lists **ALL files** where you need to add your Supabase credentials and API keys.

## 📝 Files You Need to CREATE and EDIT

### 1. Backend Environment File ⭐ **REQUIRED**
**File:** `src/obsidian-backend-flask/.env`  
**Status:** ❌ Create this file (copy from `.env.example` if it exists)

**Content to add:**
```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# OpenAI API Key
OPENAI_API_KEY=sk-your_openai_api_key_here

# Flask Configuration
SECRET_KEY=your-secure-random-string-here
FLASK_ENV=development
FLASK_DEBUG=True

# Server Configuration
PORT=5000
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGINS=*
```

**How to create:**
1. Navigate to `src/obsidian-backend-flask/` folder
2. Create a new file named `.env` (no extension)
3. Copy the content above
4. Replace all placeholder values with your actual credentials

---

### 2. Frontend Environment File ⭐ **REQUIRED**
**File:** `.env` (in project root)  
**Status:** ❌ Create this file

**Content to add:**
```env
# API URL - Points to your backend server
VITE_API_URL=http://localhost:5000
```

**How to create:**
1. In the project root folder
2. Create a new file named `.env` (no extension)
3. Add the line above (default should work for local development)

---

## 📖 Files That READ These Variables (Don't Edit These)

These files automatically read from the `.env` files above. You don't need to edit them, but here's where they're used:

### Backend Configuration Files:

#### 1. `src/obsidian-backend-flask/config/settings.py`
**Purpose:** Loads all environment variables  
**Reads from:** `src/obsidian-backend-flask/.env`  
**Variables used:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `SECRET_KEY`
- `PORT`, `HOST`, `CORS_ORIGINS`

#### 2. `src/obsidian-backend-flask/supabase_client.py`
**Purpose:** Creates Supabase client connections  
**Reads from:** `settings.SUPABASE_URL`, `settings.SUPABASE_ANON_KEY`, `settings.SUPABASE_SERVICE_KEY`  
**Uses:**
- Supabase URL and keys to connect to database

#### 3. `src/obsidian-backend-flask/services/ai_tutor_service.py`
**Purpose:** OpenAI API integration  
**Reads from:** `settings.OPENAI_API_KEY`  
**Uses:**
- OpenAI API key to make AI requests

### Frontend Configuration Files:

#### 4. `src/utils/api.ts`
**Purpose:** API client for frontend  
**Reads from:** `import.meta.env.VITE_API_URL`  
**Uses:**
- `VITE_API_URL` to connect to backend API

#### 5. `vite.config.ts`
**Purpose:** Vite build configuration  
**May use:** Environment variables for build-time configuration

---

## 🔑 Where to Get Your Credentials

### Supabase Credentials

1. **Go to:** https://app.supabase.com
2. **Select your project** (or create new)
3. **Navigate to:** Settings → API
4. **Copy these values:**
   - **Project URL** → Use for `SUPABASE_URL`
   - **anon public key** → Use for `SUPABASE_ANON_KEY`
   - **service_role key** → Use for `SUPABASE_SERVICE_KEY` ⚠️ **KEEP SECRET!**

### OpenAI API Key

1. **Go to:** https://platform.openai.com
2. **Sign in** or create account
3. **Navigate to:** API Keys section
4. **Click:** "Create new secret key"
5. **Copy the key** → Use for `OPENAI_API_KEY`

### Flask Secret Key

Generate a secure random string:
- **Option 1:** Use Python: `python -c "import secrets; print(secrets.token_hex(32))"`
- **Option 2:** Use online generator: https://randomkeygen.com/
- **Option 3:** Use any secure random string generator

---

## ✅ Quick Setup Checklist

- [ ] Create `src/obsidian-backend-flask/.env` file
- [ ] Add Supabase credentials to backend `.env`
- [ ] Add OpenAI API key to backend `.env`
- [ ] Add Flask SECRET_KEY to backend `.env`
- [ ] Create `.env` file in project root
- [ ] Add `VITE_API_URL` to frontend `.env` (or use default)
- [ ] Verify no `.env` files are committed to git
- [ ] Test with `npm start`

---

## 🚨 Important Security Notes

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Never share your `SUPABASE_SERVICE_KEY`** - It has admin database access
3. **Never share your `OPENAI_API_KEY`** - It can be used to make API calls on your account
4. **Rotate keys immediately** if accidentally exposed
5. **Use different keys for development and production**

---

## 🧪 Testing Your Configuration

After setting up, verify everything works:

```bash
# 1. Start the application
npm start

# 2. Check backend logs for:
#    ✓ Configuration validated successfully
#    🚀 Starting Obsidian API on 0.0.0.0:5000

# 3. Check frontend logs for:
#    VITE v6.x.x  ready in xxx ms
#    ➜  Local:   http://localhost:5173/

# 4. Test in browser:
#    - Open http://localhost:5173
#    - Try using the chat interface
#    - Check browser console for errors
```

---

## 📚 File Structure Reference

```
AI Learning Assistant Features/
├── .env                          ← CREATE THIS (Frontend config)
├── src/
│   └── obsidian-backend-flask/
│       ├── .env                  ← CREATE THIS (Backend config)
│       ├── config/
│       │   └── settings.py       ← Reads .env (don't edit)
│       ├── supabase_client.py    ← Uses Supabase keys (don't edit)
│       └── services/
│           └── ai_tutor_service.py ← Uses OpenAI key (don't edit)
└── src/
    └── utils/
        └── api.ts                ← Uses VITE_API_URL (don't edit)
```

---

## 💡 Pro Tips

1. **Use `.env.example` files** as templates (safe to commit)
2. **Document your setup** in a private note for team members
3. **Use environment-specific files** for dev/staging/production
4. **Validate early** - Run `npm start` immediately after setup to catch errors
5. **Keep backups** of your credentials in a secure password manager

---

## 🆘 Troubleshooting

**Error: "Missing required environment variables"**
- Check that `.env` file exists in correct location
- Verify all required variables are present
- Check for typos in variable names

**Error: "OpenAI API error"**
- Verify `OPENAI_API_KEY` is correct
- Check your OpenAI account has credits
- Ensure API key hasn't been revoked

**Error: "Supabase connection failed"**
- Verify `SUPABASE_URL` is correct (should end with `.supabase.co`)
- Check `SUPABASE_ANON_KEY` matches your project
- Ensure Supabase project is active

**Frontend can't connect to backend**
- Verify `VITE_API_URL` matches backend port (default: 5000)
- Check backend is running
- Verify CORS is configured correctly


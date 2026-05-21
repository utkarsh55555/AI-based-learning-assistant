# Environment Variables Setup Guide

This guide shows you all the files where you need to add your Supabase credentials and API keys.

## 📁 Files to Configure

### 1. Backend Environment File
**Location:** `src/obsidian-backend-flask/.env`

**Create this file** by copying `src/obsidian-backend-flask/.env.example`:
```bash
cp src/obsidian-backend-flask/.env.example src/obsidian-backend-flask/.env
```

**Required Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key (keep this secret!)
- `OPENAI_API_KEY` - Your OpenAI API key
- `SECRET_KEY` - Flask secret key (generate a secure random string)

### 2. Frontend Environment File
**Location:** `.env` (in project root)

**Create this file** by copying `.env.example`:
```bash
cp .env.example .env
```

**Required Variables:**
- `VITE_API_URL` - Backend API URL (default: `http://localhost:5000`)

## 🔑 Where to Get Your Credentials

### Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY` ⚠️ Keep this secret!

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in or create an account
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy the key → `OPENAI_API_KEY`

⚠️ **Important:** Never commit `.env` files to git! They're already in `.gitignore`.

## 📝 Configuration Files Reference

These files **read** the environment variables (you don't edit them):

### Backend Files:
- `src/obsidian-backend-flask/config/settings.py` - Reads all backend env vars
- `src/obsidian-backend-flask/supabase_client.py` - Uses Supabase credentials
- `src/obsidian-backend-flask/services/ai_tutor_service.py` - Uses OpenAI API key

### Frontend Files:
- `src/utils/api.ts` - Uses `VITE_API_URL` to connect to backend
- `vite.config.ts` - May use env vars for build configuration

## ✅ Quick Setup Steps

1. **Create backend .env:**
   ```bash
   # Copy the example file
   cp src/obsidian-backend-flask/.env.example src/obsidian-backend-flask/.env
   
   # Edit with your credentials
   # Use any text editor to fill in your actual values
   ```

2. **Create frontend .env:**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit if needed (default should work for local dev)
   ```

3. **Fill in your credentials:**
   - Open `src/obsidian-backend-flask/.env`
   - Replace all placeholder values with your actual credentials
   - Save the file

4. **Verify setup:**
   ```bash
   npm start
   ```
   
   If configured correctly, both servers should start without errors.

## 🚨 Security Notes

- ⚠️ **Never commit `.env` files** - They contain sensitive keys
- ⚠️ **Never share your `SUPABASE_SERVICE_KEY`** - It has admin access
- ⚠️ **Never share your `OPENAI_API_KEY`** - It can incur charges
- ✅ Use `.env.example` files as templates (these are safe to commit)
- ✅ Rotate keys if they're accidentally exposed

## 🔍 Verifying Your Setup

After setting up, you can verify:

1. **Backend validation:**
   ```bash
   cd src/obsidian-backend-flask
   python app.py
   ```
   Should show: `✓ Configuration validated successfully`

2. **Frontend connection:**
   - Start both servers with `npm start`
   - Check browser console for API connection errors
   - Try using the chat interface to test OpenAI connection

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Flask Environment Variables](https://flask.palletsprojects.com/en/latest/config/)


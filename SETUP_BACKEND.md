# Backend Setup Guide

## Quick Fix for "Failed to fetch" Error

The "Failed to fetch" error occurs because the backend server is not running. Follow these steps:

### 1. Create Backend Environment File

Create a file named `.env` in the `src/obsidian-backend-flask/` directory with the following content:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Flask Configuration
SECRET_KEY=dev-secret-key-change-in-production
FLASK_ENV=development
FLASK_DEBUG=True

# Server Configuration
PORT=5000
HOST=0.0.0.0

# CORS Configuration
CORS_ORIGINS=*
```

### 2. Get Your API Keys

- **Supabase**: Go to https://app.supabase.com → Your Project → Settings → API
  - Copy the `Project URL` → `SUPABASE_URL`
  - Copy the `anon public` key → `SUPABASE_ANON_KEY`
  - Copy the `service_role` key → `SUPABASE_SERVICE_KEY`

- **OpenAI**: Go to https://platform.openai.com/api-keys
  - Create a new API key → `OPENAI_API_KEY`

### 3. Start the Backend

Run this command in the project root:

```bash
npm start
```

This will start both the frontend (port 3000) and backend (port 5000) simultaneously.

### 4. Verify Backend is Running

Open http://localhost:5000/health in your browser. You should see:
```json
{"status": "healthy", "message": "Obsidian API is running"}
```

### Troubleshooting

- **Backend won't start**: Make sure Python 3.8+ is installed and all dependencies are installed:
  ```bash
  cd src/obsidian-backend-flask
  pip install -r requirements.txt
  ```

- **Still getting connection errors**: 
  - Check that port 5000 is not in use by another application
  - Verify the `.env` file exists in `src/obsidian-backend-flask/`
  - Check the backend terminal for error messages

- **CORS errors**: The backend is configured to allow all origins (`*`) in development. If you need specific origins, update `CORS_ORIGINS` in `.env`.


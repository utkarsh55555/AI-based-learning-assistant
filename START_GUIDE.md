# Quick Start Guide

## Starting the Application

### Option 1: Using npm start (Recommended)
```bash
npm start
```

This will start both the backend (Flask) and frontend (Vite) servers simultaneously.

- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5173 (or port configured in vite.config.ts)

### Option 2: Using the Batch File (Windows)
```bash
src\start-obsidian.bat
```

### Option 3: Start Separately

**Backend only:**
```bash
npm run backend
```

**Frontend only:**
```bash
npm run dev
```

## Prerequisites

1. **Python 3.x** installed and available in PATH
2. **Node.js** and npm installed
3. **Environment variables** configured:
   - Backend: Create `.env` file in `src/obsidian-backend-flask/`
   - Frontend: Create `.env` file in root with `VITE_API_URL=http://localhost:5000`

## Environment Setup

### Backend (.env in `src/obsidian-backend-flask/`)
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your-secret-key-change-in-production
PORT=5000
HOST=0.0.0.0
CORS_ORIGINS=*
```

### Frontend (.env in root)
```
VITE_API_URL=http://localhost:5000
```

## Stopping the Servers

Press `Ctrl+C` in the terminal to stop both servers. The `-k` flag ensures both processes are terminated together.

## Troubleshooting

- **Backend won't start**: Check that Python is installed and environment variables are set
- **Frontend won't start**: Run `npm install` to ensure all dependencies are installed
- **Port already in use**: Change the port in `vite.config.ts` (frontend) or `.env` (backend)


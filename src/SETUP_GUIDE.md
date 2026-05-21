# 🔮 Obsidian AI Learning Companion - Setup Guide

## 📋 Prerequisites

- **Python 3.8+** installed
- **Node.js 16+** and npm installed
- **Supabase account** with a project created
- **OpenAI API key**

---

## 🚀 Quick Start (One Command Setup)

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd obsidian-backend-flask
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Go back to root
cd ..
```

### Step 2: Configure Environment Variables

Your `.env` file is already created at `/obsidian-backend-flask/.env`

Make sure it contains:
```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-...
SECRET_KEY=your-generated-random-string
FRONTEND_URL=http://localhost:5173
```

### Step 3: Check & Create Database Tables

Run the database checker to see if your tables are created:

```bash
npm run check-db
```

**If tables are missing**, the script will show you instructions. Follow these steps:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy ALL content from `/obsidian-backend-flask/supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Then copy and run `/obsidian-backend-flask/supabase/policies.sql`
6. Run `npm run check-db` again to verify

### Step 4: Start Both Servers with ONE COMMAND! 🎉

```bash
npm start
```

This will run:
- **Flask Backend** on `http://localhost:5000` (blue output)
- **React Frontend** on `http://localhost:5173` (cyan output)

---

## 📊 Database Tables

Your Obsidian app requires these 9 tables:

1. ✅ **user_profiles** - User data, XP, streaks
2. ✅ **quizzes** - AI-generated quizzes
3. ✅ **quiz_attempts** - Quiz results and scores
4. ✅ **mindmaps** - Mind map data
5. ✅ **notes** - User notes and summaries
6. ✅ **study_plans** - Personalized study plans
7. ✅ **study_sessions** - Pomodoro timer sessions
8. ✅ **chat_conversations** - AI tutor chat history
9. ✅ **user_activities** - Activity logs for gamification

---

## 🔧 Troubleshooting

### "Table does not exist" errors
- Run `npm run check-db` to see which tables are missing
- Follow the SQL migration steps in the output

### Backend won't start
- Make sure your virtual environment is activated
- Check that all keys in `.env` are filled in (no placeholders)
- Verify your Supabase URL and keys are correct

### Frontend can't connect to backend
- Make sure backend is running on port 5000
- Check CORS settings if you get CORS errors
- Verify `FRONTEND_URL` in `.env` matches your frontend URL

### "Module not found" errors (Python)
```bash
cd obsidian-backend-flask
pip install -r requirements.txt
```

### "Module not found" errors (Node)
```bash
npm install
```

---

## 🎯 Alternative Commands

If you prefer to run servers separately:

**Backend only:**
```bash
npm run backend
```

**Frontend only:**
```bash
npm run dev
```

**Check database:**
```bash
npm run check-db
```

---

## 🎨 Features Checklist

After setup, your Obsidian app will have:

- ✅ AI GPT-4 Tutor with voice interaction
- ✅ Gamification (XP, levels, achievements)
- ✅ AI-powered quiz generation with camera monitoring
- ✅ Mind maps with virtual topic expansion
- ✅ Notes & summaries generator
- ✅ Pomodoro study timer
- ✅ Leaderboard system
- ✅ Study planner with AI recommendations
- ✅ Streak tracking & daily goals
- ✅ Profile system with avatar customization

---

## 🔐 Security Notes

⚠️ **NEVER commit your `.env` file to Git!**

The `.env` file contains sensitive API keys. It's already in `.gitignore`, but double-check before pushing to GitHub.

---

## 📞 Need Help?

If you encounter issues:

1. Run `npm run check-db` to verify database setup
2. Check that all `.env` variables are filled in correctly
3. Make sure both Python and Node.js are installed
4. Verify your Supabase project is active and not paused

---

**🚀 Ready to learn with Obsidian!**

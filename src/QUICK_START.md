# ⚡ Obsidian - Quick Start Guide

## 🎯 TL;DR - Get Started in 3 Steps

### 1️⃣ Install Everything
```bash
npm install
cd obsidian-backend-flask && pip install -r requirements.txt && cd ..
```

### 2️⃣ Set Up Database
```bash
npm run check-db
```
Follow instructions if tables are missing.

### 3️⃣ Start App
```bash
npm start
```

**That's it!** 🎉

Open http://localhost:5173 in your browser.

---

## ✅ Pre-Flight Checklist

Before running `npm start`, make sure:

- [ ] `.env` file exists in `/obsidian-backend-flask/` with all 5 keys filled
- [ ] `npm run check-db` shows all 9 tables exist
- [ ] Node.js and Python are installed
- [ ] You've run `npm install` and `pip install -r requirements.txt`

---

## 🔑 Required API Keys

You need these 4 keys in your `.env` file:

| Key | Where to Get It |
|-----|----------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `SECRET_KEY` | Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` |

---

## 📊 Database Setup

If `npm run check-db` shows missing tables:

1. Go to: https://app.supabase.com → Your Project → SQL Editor
2. Click "New Query"
3. Copy & paste `/obsidian-backend-flask/supabase/migrations/001_initial_schema.sql`
4. Click "Run"
5. Copy & paste `/obsidian-backend-flask/supabase/policies.sql`
6. Click "Run"
7. Run `npm run check-db` again ✅

---

## 🚀 Running the App

### Option 1: One Command (Recommended)
```bash
npm start
```

### Option 2: Windows Double-Click
Double-click `start-obsidian.bat`

### Option 3: Mac/Linux Script
```bash
chmod +x start-obsidian.sh
./start-obsidian.sh
```

### Option 4: Manual (Separate Terminals)

**Terminal 1 - Backend:**
```bash
cd obsidian-backend-flask
source venv/bin/activate  # or venv\Scripts\activate on Windows
python app.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

---

## 🎮 First Login

1. Open http://localhost:5173
2. Click "Sign Up" (not "Login")
3. Create account with any email/password
4. Start learning! 🎓

---

## 🆘 Troubleshooting

### "Cannot find module" (Node)
```bash
npm install
```

### "Module not found" (Python)
```bash
cd obsidian-backend-flask
pip install -r requirements.txt
```

### "Table does not exist"
```bash
npm run check-db
```
Then follow the database setup instructions above.

### Backend won't start
Check your `.env` file - make sure no values say "your-xxx-here"

### Frontend shows "Network Error"
Make sure backend is running on port 5000 (check the terminal)

---

## 📱 What You'll See

After starting, you'll have access to:

✨ **AI Tutor** - Chat with GPT-4 for help
📝 **Smart Quizzes** - AI-generated practice tests  
🧠 **Mind Maps** - Visual learning with topic expansion
📚 **Notes** - AI-powered study notes
⏱️ **Study Timer** - Pomodoro technique
📊 **Progress** - Track XP, levels, and achievements
🏆 **Leaderboard** - Compare with other learners
📅 **Study Planner** - Personalized learning schedules

---

## 🎨 Theme Colors

Obsidian uses a **Stealth Blue** aesthetic:

- Electric Blue: `#3B82F6`, `#60A5FA`
- Dark Blue: `#2563EB`, `#1D4ED8`
- Black backgrounds for that elite tech vibe

---

## 💡 Tips

1. **Start with the AI Tutor** - Ask anything to get personalized help
2. **Take quizzes daily** - Earn XP and maintain your streak
3. **Use mind maps** - Great for complex topics
4. **Set study sessions** - Pomodoro timer helps you focus
5. **Check leaderboard** - Stay motivated by competing

---

## 📞 Still Stuck?

1. Check all 5 keys are in `.env` with real values
2. Run `npm run check-db` to verify database
3. Make sure both servers are running (backend + frontend)
4. Check browser console for error messages
5. Restart both servers with `npm start`

---

**Happy Learning! 🚀**

Remember: Consistent daily practice beats cramming. Use Obsidian every day to build your streak! 🔥

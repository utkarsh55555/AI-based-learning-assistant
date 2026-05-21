# 🚀 START HERE - Complete Setup Instructions

Welcome to **Obsidian AI Learning Companion**! This guide will get you from zero to running app in **5 minutes**.

---

## ⚡ Quick Answer to Your Questions

### ❓ "How can I run both backend and frontend with just one command?"

**Answer:** Use this command:

```bash
npm start
```

That's it! This runs both servers simultaneously with color-coded output.

**Alternative quick-start scripts:**
- **Windows:** Double-click `start-obsidian.bat`
- **Mac/Linux:** Run `./start-obsidian.sh` (may need `chmod +x start-obsidian.sh` first)

---

### ❓ "How do I know if tables are created in Supabase?"

**Answer:** Run this command:

```bash
npm run check-db
```

This script will:
- ✅ Check if all 9 required tables exist
- ❌ Show which tables are missing
- 📝 Give you exact instructions to create them

**Example output:**

```
🔍 CHECKING ENVIRONMENT VARIABLES
✓ SUPABASE_URL: https://xxxxx.supabase.co...
✓ SUPABASE_SERVICE_KEY: ********************...

📊 CHECKING DATABASE TABLES
✓ Table exists: user_profiles
✓ Table exists: quizzes
✓ Table exists: quiz_attempts
...

✅ ALL TABLES EXIST!
Your database is ready to use!

🚀 You're ready to run: npm start
```

---

## 📝 Complete Setup (First Time Only)

### Step 1: Install Dependencies

```bash
# Install frontend packages
npm install

# Install backend packages
cd obsidian-backend-flask
python -m venv venv
venv\Scripts\activate          # Windows
# OR
source venv/bin/activate       # Mac/Linux
pip install -r requirements.txt
cd ..
```

### Step 2: Configure API Keys

Edit `/obsidian-backend-flask/.env` and add your keys:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-...
SECRET_KEY=a8f5f167f44f4964e6c998dee827110c...
```

**How to get these keys:**

| Key | Where to Find It |
|-----|-----------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → Project API keys → anon public |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Settings → API → Project API keys → service_role (⚠️ secret!) |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys → Create new secret key |
| `SECRET_KEY` | Generate with: `python -c "import secrets; print(secrets.token_hex(32))"` |

### Step 3: Set Up Database Tables

```bash
npm run check-db
```

**If tables are missing:**

1. Go to https://app.supabase.com → Your Project → SQL Editor
2. Click "New Query"
3. Copy the contents of `/obsidian-backend-flask/supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor and click "Run"
5. Copy the contents of `/obsidian-backend-flask/supabase/policies.sql`
6. Paste and click "Run" again
7. Run `npm run check-db` again to verify ✅

### Step 4: Launch the App!

```bash
npm start
```

**You'll see:**
```
[BACKEND] * Running on http://127.0.0.1:5000
[FRONTEND] ➜  Local:   http://localhost:5173/
```

Open http://localhost:5173 in your browser! 🎉

---

## 🗂️ Project Files You Created

Here's what you have now:

### Configuration Files
- ✅ `package.json` - Frontend dependencies and scripts
- ✅ `vite.config.ts` - Vite configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.gitignore` - Protects your API keys from Git
- ✅ `/obsidian-backend-flask/.env` - Your API keys (KEEP SECRET!)
- ✅ `/obsidian-backend-flask/requirements.txt` - Python dependencies

### Quick Start Scripts
- ✅ `start-obsidian.bat` - Windows quick start
- ✅ `start-obsidian.sh` - Mac/Linux quick start
- ✅ `npm start` command - Runs both servers

### Database Setup
- ✅ `check_tables.py` - Verifies database setup
- ✅ `npm run check-db` command - Easy table checker
- ✅ Database migration files in `/obsidian-backend-flask/supabase/`

### Documentation
- ✅ `README.md` - Project overview
- ✅ `QUICK_START.md` - Fast setup guide
- ✅ `SETUP_GUIDE.md` - Detailed instructions
- ✅ `ARCHITECTURE.md` - System architecture
- ✅ `DEPLOYMENT_CHECKLIST.md` - Complete checklist
- ✅ `START_HERE.md` - This file!

---

## 🎯 Next Steps After Setup

Once your app is running:

1. **Create an account** - Click "Sign Up" on the login screen
2. **Explore the dashboard** - Familiarize yourself with all features
3. **Try the AI Tutor** - Ask it anything!
4. **Take a quiz** - Test your knowledge and earn XP
5. **Create a mind map** - Visualize your learning
6. **Start a study session** - Use the Pomodoro timer
7. **Check the leaderboard** - See how you rank
8. **Build your streak** - Study daily to maintain your streak 🔥

---

## 📚 Available Commands

| Command | What It Does |
|---------|--------------|
| `npm start` | 🚀 Run both backend + frontend (RECOMMENDED) |
| `npm run dev` | Run frontend only |
| `npm run backend` | Run backend only |
| `npm run check-db` | ✅ Verify database tables |
| `npm run build` | Build for production |
| `npm install` | Install frontend dependencies |
| `pip install -r requirements.txt` | Install backend dependencies |

---

## 🆘 Troubleshooting

### "Cannot find module" errors
```bash
npm install
cd obsidian-backend-flask && pip install -r requirements.txt
```

### Backend won't start
- Make sure virtual environment is activated
- Check that `.env` has real values (not "your-xxx-here")
- Verify port 5000 is not in use

### Frontend shows "Network Error"
- Make sure backend is running (check terminal)
- Backend should be on http://localhost:5000

### Database errors
```bash
npm run check-db
```
Follow the instructions to create missing tables.

### "Module 'colorama' not found"
```bash
cd obsidian-backend-flask
pip install colorama
```

---

## 🎨 What You Built

You now have a complete AI learning platform with:

- 🤖 **AI Tutor** powered by GPT-4
- 📝 **Smart Quizzes** with AI generation
- 🧠 **Mind Maps** with virtual topic expansion
- 📚 **Notes** with AI summarization
- ⏱️ **Study Timer** with Pomodoro technique
- 🏆 **Gamification** (XP, levels, achievements, streaks)
- 📊 **Leaderboard** to compete with others
- 📅 **Study Planner** with AI recommendations
- 🎥 **Camera Monitoring** for quiz integrity
- 💎 **Premium UI** with stealth blue theme

---

## 🔐 Security Reminder

⚠️ **NEVER share or commit your `.env` file!**

It contains sensitive API keys. The `.gitignore` file protects it, but always double-check before pushing to GitHub.

---

## 📞 Help & Resources

**If you're stuck:**
1. Read `QUICK_START.md` for fast help
2. Check `DEPLOYMENT_CHECKLIST.md` for detailed troubleshooting
3. Run `npm run check-db` to verify setup
4. Check that all API keys are correctly filled in `.env`

**Documentation:**
- Supabase: https://supabase.com/docs
- OpenAI: https://platform.openai.com/docs
- Flask: https://flask.palletsprojects.com/
- React: https://react.dev

---

## ✅ Quick Verification

Before you consider setup complete, verify:

- [ ] `npm install` completed without errors
- [ ] `pip install -r requirements.txt` completed without errors
- [ ] `.env` file has all 5 keys filled in (no placeholders)
- [ ] `npm run check-db` shows all 9 tables exist
- [ ] `npm start` runs both servers without errors
- [ ] http://localhost:5173 opens in browser
- [ ] Login/signup screen appears

---

## 🎉 You're All Set!

**Congratulations!** You've successfully set up Obsidian AI Learning Companion.

Your app can now:
✅ Run with a single command (`npm start`)  
✅ Verify database setup automatically  
✅ Check which tables are missing  
✅ Provide clear setup instructions  

**Ready to learn?** Run `npm start` and open http://localhost:5173! 🚀

---

**Made with 💙 using cutting-edge AI technology**

*Obsidian - Learn smarter, not harder.*

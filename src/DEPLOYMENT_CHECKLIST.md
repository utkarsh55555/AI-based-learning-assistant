# ✅ Obsidian Deployment Checklist

Use this checklist to ensure everything is set up correctly before running your app.

---

## 📋 Pre-Installation Checklist

### System Requirements
- [ ] Node.js 16 or higher installed
  - Check: `node --version`
- [ ] npm installed
  - Check: `npm --version`
- [ ] Python 3.8 or higher installed
  - Check: `python --version` or `python3 --version`
- [ ] pip installed
  - Check: `pip --version` or `pip3 --version`
- [ ] Git installed (optional, for version control)
  - Check: `git --version`

### Accounts & API Keys
- [ ] Supabase account created at https://supabase.com
- [ ] Supabase project created
- [ ] OpenAI account created at https://platform.openai.com
- [ ] OpenAI API key generated (and billing set up if needed)

---

## 🔧 Installation Checklist

### 1. Frontend Setup
- [ ] Run `npm install` in root directory
- [ ] All packages installed without errors
- [ ] `node_modules/` folder created

### 2. Backend Setup
- [ ] Navigate to `obsidian-backend-flask/` folder
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate virtual environment
  - [ ] Windows: `venv\Scripts\activate`
  - [ ] Mac/Linux: `source venv/bin/activate`
- [ ] Run `pip install -r requirements.txt`
- [ ] All Python packages installed without errors

### 3. Environment Variables
- [ ] `.env` file exists in `/obsidian-backend-flask/`
- [ ] `SUPABASE_URL` is filled in (not placeholder)
  - Format: `https://xxxxxxxxxxxxx.supabase.co`
- [ ] `SUPABASE_ANON_KEY` is filled in (not placeholder)
  - Starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
- [ ] `SUPABASE_SERVICE_KEY` is filled in (not placeholder)
  - Starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
  - ⚠️ Different from anon key!
- [ ] `OPENAI_API_KEY` is filled in (not placeholder)
  - Starts with: `sk-`
- [ ] `SECRET_KEY` is filled in (not placeholder)
  - Random 32+ character string
- [ ] `FRONTEND_URL` is set to `http://localhost:5173`
- [ ] No quotes around any values
- [ ] No spaces before/after `=` signs

---

## 🗄️ Database Setup Checklist

### Supabase Project Configuration
- [ ] Logged into Supabase dashboard
- [ ] Project is active (not paused)
- [ ] Copied project URL correctly
- [ ] Copied anon key correctly
- [ ] Copied service_role key correctly (⚠️ keep this secret!)

### Database Tables
- [ ] Run `npm run check-db` to verify table status
- [ ] All 9 required tables exist:
  - [ ] user_profiles
  - [ ] quizzes
  - [ ] quiz_attempts
  - [ ] mindmaps
  - [ ] notes
  - [ ] study_plans
  - [ ] study_sessions
  - [ ] chat_conversations
  - [ ] user_activities

### If Tables Are Missing
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `obsidian-backend-flask/supabase/migrations/001_initial_schema.sql`
- [ ] Paste and run in SQL Editor
- [ ] Wait for "Success" message
- [ ] Copy contents of `obsidian-backend-flask/supabase/policies.sql`
- [ ] Paste and run in SQL Editor
- [ ] Wait for "Success" message
- [ ] Run `npm run check-db` again to verify

---

## 🚀 Launch Checklist

### Pre-Launch Verification
- [ ] All environment variables are set correctly
- [ ] All database tables exist
- [ ] Virtual environment is activated (for backend)
- [ ] No other apps using port 5000 or 5173

### Starting the Application
- [ ] Run `npm start` from root directory
- [ ] Backend starts without errors (blue output)
- [ ] Frontend starts without errors (cyan output)
- [ ] Backend accessible at http://localhost:5000
- [ ] Frontend accessible at http://localhost:5173
- [ ] No error messages in either terminal

### Browser Testing
- [ ] Open http://localhost:5173 in browser
- [ ] Page loads without errors
- [ ] No console errors in browser dev tools (F12)
- [ ] Login/Signup screen appears
- [ ] Intro animation plays smoothly

---

## 🧪 Functionality Testing Checklist

### Authentication
- [ ] Can create new account (Sign Up)
- [ ] Can log in with existing account
- [ ] Profile information appears
- [ ] Avatar displays correctly
- [ ] Can log out

### Dashboard
- [ ] Dashboard loads after login
- [ ] All tabs are visible
- [ ] XP bar displays correctly
- [ ] Streak counter shows
- [ ] Navigation between tabs works

### AI Tutor
- [ ] Can open chat interface
- [ ] Can type and send messages
- [ ] AI responds to messages
- [ ] Chat history persists
- [ ] Voice input button appears (if supported)

### Quizzes
- [ ] Can generate new quiz
- [ ] Quiz questions appear
- [ ] Can select answers
- [ ] Can submit quiz
- [ ] Score displays correctly
- [ ] XP is awarded
- [ ] Quiz history shows previous attempts
- [ ] Camera permission prompt appears

### Mind Maps
- [ ] Can create new mind map
- [ ] Central topic can be edited
- [ ] Can add virtual topics
- [ ] Topics expand when clicked
- [ ] Side summaries appear
- [ ] Can save mind map

### Notes
- [ ] Can create new note
- [ ] Can edit note content
- [ ] Can add tags
- [ ] Can use AI summarize
- [ ] Notes list displays
- [ ] Can delete notes

### Study Timer
- [ ] Pomodoro timer displays
- [ ] Can start/stop timer
- [ ] Timer counts down correctly
- [ ] Break timer activates after session
- [ ] Session logs are saved
- [ ] XP is awarded for completed sessions

### Study Planner
- [ ] Can generate AI study plan
- [ ] Plan displays correctly
- [ ] Can mark tasks as complete
- [ ] Progress updates
- [ ] Multiple plans can be created

### Leaderboard
- [ ] Leaderboard displays users
- [ ] Rankings are correct
- [ ] Can switch between XP and Streak views
- [ ] Current user is highlighted

### Achievements
- [ ] Achievement badges display
- [ ] Unlocked achievements show
- [ ] Locked achievements are grayed out
- [ ] Achievement animations play

### Profile
- [ ] Profile section shows user info
- [ ] XP bar displays correctly
- [ ] Level is calculated correctly (total_xp / 100)
- [ ] Streak is accurate
- [ ] Can edit profile information
- [ ] Can change avatar

---

## 🔒 Security Checklist

### Environment Security
- [ ] `.env` file is in `.gitignore`
- [ ] Never committed `.env` to Git
- [ ] `SECRET_KEY` is random and secure
- [ ] `SUPABASE_SERVICE_KEY` kept private
- [ ] `OPENAI_API_KEY` kept private

### Supabase Security
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] RLS policies are active (from policies.sql)
- [ ] Users can only access their own data
- [ ] Anonymous access is restricted

### Application Security
- [ ] Authentication required for all protected routes
- [ ] JWT tokens are validated
- [ ] Camera permissions are requested (not forced)
- [ ] No sensitive data in browser localStorage
- [ ] CORS is properly configured

---

## 📊 Performance Checklist

### Frontend Performance
- [ ] Page loads in < 3 seconds
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts (CLS)
- [ ] Images load quickly
- [ ] No console warnings

### Backend Performance
- [ ] API responses in < 500ms (except AI calls)
- [ ] AI tutor responds in < 5 seconds
- [ ] Quiz generation in < 10 seconds
- [ ] Database queries are fast
- [ ] No timeout errors

### Resource Usage
- [ ] Backend memory usage reasonable
- [ ] Frontend memory usage reasonable
- [ ] No memory leaks
- [ ] CPU usage normal
- [ ] Network requests are minimal

---

## 🐛 Debugging Checklist

If something doesn't work, check these:

### Backend Issues
- [ ] Virtual environment is activated
- [ ] All packages installed: `pip list`
- [ ] `.env` file has correct values
- [ ] Port 5000 is not in use by another app
- [ ] Supabase URL is reachable
- [ ] OpenAI API key is valid and has credits

### Frontend Issues
- [ ] All packages installed: `npm list`
- [ ] Port 5173 is not in use
- [ ] Backend is running
- [ ] Browser console shows no errors
- [ ] Cache cleared (Ctrl+Shift+R)

### Database Issues
- [ ] Supabase project is active
- [ ] All tables exist (`npm run check-db`)
- [ ] RLS policies are active
- [ ] Service key has correct permissions

### API Issues
- [ ] Backend logs show the request
- [ ] Request body is valid JSON
- [ ] Authentication token is included
- [ ] CORS headers are present
- [ ] Status code indicates error type

---

## 📝 Pre-Deployment Checklist (Production)

When you're ready to deploy to production:

### Code Quality
- [ ] All features working in development
- [ ] No console.log statements
- [ ] No commented code
- [ ] Code is documented
- [ ] TypeScript errors resolved
- [ ] Python linting passed

### Build Process
- [ ] `npm run build` succeeds
- [ ] Build output is optimized
- [ ] Assets are compressed
- [ ] Source maps generated

### Environment Configuration
- [ ] Production `.env` created
- [ ] Production Supabase project ready
- [ ] Production OpenAI key ready
- [ ] CORS configured for production domain
- [ ] SSL certificate ready (HTTPS)

### Hosting Setup
- [ ] Frontend hosting chosen (Vercel/Netlify)
- [ ] Backend hosting chosen (Heroku/Railway)
- [ ] Domain name registered (optional)
- [ ] DNS configured
- [ ] Environment variables set on hosting platform

### Final Testing
- [ ] Test on production environment
- [ ] Mobile responsive testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Load testing (if expecting high traffic)
- [ ] Security audit completed

---

## 🎉 Success Criteria

Your Obsidian app is ready when:

✅ All 9 database tables exist  
✅ Frontend and backend run without errors  
✅ Authentication works (signup/login)  
✅ AI tutor responds to messages  
✅ Quizzes can be generated and submitted  
✅ XP and streak tracking works  
✅ All major features are functional  
✅ No critical bugs or errors  
✅ Performance is acceptable  
✅ Security measures are in place  

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **OpenAI Docs**: https://platform.openai.com/docs
- **Flask Docs**: https://flask.palletsprojects.com/
- **React Docs**: https://react.dev
- **Tailwind Docs**: https://tailwindcss.com/docs

---

**Print this checklist and mark off items as you complete them! 📝**

Good luck with your Obsidian AI Learning Companion! 🚀

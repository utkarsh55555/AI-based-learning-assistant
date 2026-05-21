# 🔮 Obsidian - AI Learning Companion

A comprehensive AI-powered learning platform featuring GPT-4 tutoring, gamification, quiz generation, mind mapping, and study planning with a stunning stealth blue cyberpunk aesthetic.

![Obsidian](https://img.shields.io/badge/AI-Powered-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)

---

## ✨ Features

### 🤖 AI-Powered Learning
- **GPT-4 Tutor** - Real-time AI tutoring with voice interaction
- **Smart Quiz Generation** - AI creates personalized quizzes with camera monitoring
- **Mind Maps** - Virtual topic expansion like Google NotebookLM
- **Note Summarization** - AI-generated study notes and summaries

### 🎮 Gamification
- **XP & Leveling System** - Earn points for studying
- **Achievements & Badges** - Unlock rewards for milestones
- **Streak Tracking** - Maintain daily study streaks
- **Leaderboard** - Compete with other learners

### 📚 Study Tools
- **Pomodoro Timer** - Focused study sessions with breaks
- **Study Planner** - AI-generated personalized study plans
- **Progress Tracking** - Monitor your learning journey
- **Notes & Flashcards** - Create and organize study materials

### 🎨 Design
- **Stealth Blue Theme** - Elite tech/AI cyberpunk aesthetic
- **Electric Blue Accents** - (#3B82F6, #60A5FA)
- **Premium Microinteractions** - Smooth animations and transitions
- **Responsive Design** - Works on all devices

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Supabase account
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up Python backend:**
```bash
cd obsidian-backend-flask
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

3. **Configure environment variables:**

Edit `/obsidian-backend-flask/.env` with your API keys:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
OPENAI_API_KEY=your-openai-key
SECRET_KEY=your-random-secret-key
```

4. **Check database setup:**
```bash
npm run check-db
```

If tables are missing, go to Supabase SQL Editor and run:
- `/obsidian-backend-flask/supabase/migrations/001_initial_schema.sql`
- `/obsidian-backend-flask/supabase/policies.sql`

5. **Start the app (ONE COMMAND!):**
```bash
npm start
```

Or use the convenience scripts:
- **Windows:** Double-click `start-obsidian.bat`
- **Mac/Linux:** Run `./start-obsidian.sh`

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## 📁 Project Structure

```
obsidian/
├── components/              # React components
│   ├── ui/                 # Shadcn UI components
│   ├── Dashboard.tsx       # Main dashboard
│   ├── ChatInterface.tsx   # AI tutor chat
│   ├── QuizMode.tsx        # Quiz system
│   ├── MindMapBuilder.tsx  # Mind mapping
│   └── ...
├── obsidian-backend-flask/ # Flask backend
│   ├── routes/            # API routes
│   ├── controllers/       # Business logic
│   ├── services/          # External services
│   ├── supabase/          # Database migrations
│   └── app.py            # Main Flask app
├── styles/                # Global styles
└── App.tsx               # Main React app
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run both frontend and backend together |
| `npm run dev` | Run frontend only (Vite dev server) |
| `npm run backend` | Run backend only (Flask server) |
| `npm run check-db` | Check database table status |
| `npm run build` | Build for production |

---

## 🗄️ Database Tables

Obsidian uses 9 Supabase tables:

1. **user_profiles** - User data, XP, streaks
2. **quizzes** - AI-generated quizzes
3. **quiz_attempts** - Quiz results and scores
4. **mindmaps** - Mind map data
5. **notes** - User notes and summaries
6. **study_plans** - Personalized study plans
7. **study_sessions** - Pomodoro timer sessions
8. **chat_conversations** - AI tutor chat history
9. **user_activities** - Activity logs

---

## 🔐 Security

- All API keys are stored in `.env` (not committed to Git)
- Supabase Row Level Security (RLS) policies enabled
- JWT authentication for user sessions
- Camera permissions required for quiz monitoring

---

## 🎯 Tech Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS 4.0
- Shadcn UI components
- Motion (Framer Motion) animations
- Recharts for data visualization
- Lucide icons

**Backend:**
- Flask 3.0
- Supabase (PostgreSQL)
- OpenAI GPT-4 API
- JWT authentication

---

## 📝 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Detailed installation instructions
- [Color Scheme](STEALTH_BLUE_THEME.md) - Design system documentation
- [Backend README](obsidian-backend-flask/README.md) - API documentation

---

## 🤝 Contributing

This is a personal learning project. Feel free to fork and customize!

---

## 📄 License

MIT License - feel free to use this project for your own learning!

---

## 🙏 Credits

- Built with [Figma Make](https://figma.com)
- Powered by [OpenAI GPT-4](https://openai.com)
- Database by [Supabase](https://supabase.com)
- UI components from [Shadcn](https://ui.shadcn.com)

---

**Made with 💙 by [Your Name]**

*Obsidian - Learn smarter, not harder.*

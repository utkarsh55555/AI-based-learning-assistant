# Obsidian Backend - Flask API

AI Learning Companion Backend built with Flask and Supabase.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Supabase account
- OpenAI API key

### Installation

1. **Clone and navigate to backend folder:**
```bash
cd obsidian-backend-flask
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables:**

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
```

5. **Set up Supabase database:**

Run the SQL migrations in your Supabase SQL editor:
- First, run `supabase/migrations/001_initial_schema.sql`
- Then, run `supabase/policies.sql`

6. **Run the application:**
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
obsidian-backend-flask/
├── app.py                  # Flask entry point
├── requirements.txt        # Dependencies
├── supabase_client.py      # Supabase client config
├── config/
│   └── settings.py         # Environment configuration
├── routes/                 # API endpoints
│   ├── auth_routes.py
│   ├── user_routes.py
│   ├── quiz_routes.py
│   ├── tutor_routes.py
│   ├── mindmap_routes.py
│   ├── notes_routes.py
│   ├── study_routes.py
│   └── leaderboard_routes.py
├── controllers/            # Business logic
│   ├── auth_controller.py
│   ├── user_controller.py
│   ├── quiz_controller.py
│   ├── tutor_controller.py
│   ├── mindmap_controller.py
│   ├── notes_controller.py
│   ├── study_controller.py
│   └── leaderboard_controller.py
├── services/               # Core services
│   ├── ai_tutor_service.py
│   ├── xp_service.py
│   ├── streak_service.py
│   └── supabase_service.py
├── middlewares/            # Request middlewares
│   ├── auth_middleware.py
│   └── error_handler.py
├── utils/                  # Helper functions
│   ├── response.py
│   └── validator.py
└── supabase/              # Database migrations
    ├── migrations/
    └── policies.sql
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/dashboard` - Get dashboard stats
- `POST /api/user/activity` - Record activity

### Quiz
- `POST /api/quiz/generate` - Generate AI quiz
- `GET /api/quiz/<id>` - Get quiz by ID
- `GET /api/quiz/history` - Get quiz history
- `POST /api/quiz/<id>/submit` - Submit quiz
- `GET /api/quiz/stats` - Get quiz statistics

### AI Tutor
- `POST /api/tutor/chat` - Chat with AI
- `POST /api/tutor/explain` - Get concept explanation
- `GET /api/tutor/history` - Get conversation history

### Mind Maps
- `POST /api/mindmap/` - Create mind map
- `POST /api/mindmap/generate` - Generate AI mind map
- `GET /api/mindmap/` - Get user's mind maps
- `GET /api/mindmap/<id>` - Get mind map by ID
- `PUT /api/mindmap/<id>` - Update mind map
- `DELETE /api/mindmap/<id>` - Delete mind map

### Notes
- `POST /api/notes/` - Create note
- `GET /api/notes/` - Get user's notes
- `GET /api/notes/<id>` - Get note by ID
- `PUT /api/notes/<id>` - Update note
- `DELETE /api/notes/<id>` - Delete note
- `GET /api/notes/search?q=term` - Search notes

### Study
- `POST /api/study/plan` - Create study plan
- `GET /api/study/plan/<id>` - Get study plan
- `GET /api/study/plans` - Get all plans
- `PUT /api/study/plan/<id>/progress` - Update progress
- `POST /api/study/session` - Record study session
- `GET /api/study/stats` - Get study statistics

### Leaderboard
- `GET /api/leaderboard/global` - Global leaderboard
- `GET /api/leaderboard/streak` - Streak leaderboard
- `GET /api/leaderboard/rank` - Get user rank
- `GET /api/leaderboard/subject/<subject>` - Subject leaderboard

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

## 🌐 CORS Configuration

CORS is enabled for all `/api/*` endpoints. Update `CORS_ORIGINS` in `.env` for production.

## 📊 Database Schema

The application uses the following main tables:
- `user_profiles` - User information and stats
- `quizzes` - Quiz definitions
- `quiz_attempts` - Quiz submissions
- `mindmaps` - Mind map data
- `notes` - User notes
- `study_plans` - Study plans
- `study_sessions` - Study session logs
- `chat_conversations` - AI chat history
- `user_activities` - Activity logs

## 🚀 Deployment

### Deploy to Supabase Edge Functions

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```

4. Deploy:
```bash
supabase functions deploy obsidian-api
```

### Deploy to other platforms

The app can also be deployed to:
- **Heroku**: `git push heroku main`
- **Railway**: Connect GitHub repo
- **Render**: Connect GitHub repo
- **Google Cloud Run**: Use Docker container

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | No |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `SECRET_KEY` | Flask secret key | Yes |
| `FLASK_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No |

## 📝 License

Built by Team Obsidian ✨

## 🐛 Troubleshooting

**Issue: "Missing required environment variables"**
- Make sure all required variables in `.env` are set

**Issue: "Supabase connection failed"**
- Verify your Supabase URL and keys are correct
- Check if your Supabase project is active

**Issue: "OpenAI API error"**
- Verify your OpenAI API key is valid
- Check if you have sufficient credits

## 📚 Additional Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

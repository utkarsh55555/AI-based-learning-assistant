# 🏗️ Obsidian Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                     http://localhost:5173                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP Requests
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Dashboard  │  │  AI Tutor   │  │    Quiz     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Mind Map   │  │    Notes    │  │   Timer     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ API Calls (/api/...)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FLASK BACKEND (Python)                          │
│                   http://localhost:5000                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                        ROUTES                             │  │
│  │  /auth  /quiz  /tutor  /notes  /mindmap  /leaderboard    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │                    CONTROLLERS                            │  │
│  │  Business Logic, Validation, Request Handling             │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │                     SERVICES                              │  │
│  │  - AI Tutor Service  (GPT-4 Integration)                 │  │
│  │  - XP Service        (Gamification Logic)                │  │
│  │  - Streak Service    (Daily Tracking)                    │  │
│  │  - Supabase Service  (Database Operations)               │  │
│  └──────────┬────────────────────────────┬──────────────────┘  │
│             │                            │                      │
└─────────────┼────────────────────────────┼──────────────────────┘
              │                            │
              │ Database                   │ AI Requests
              │ Operations                 │
              ▼                            ▼
┌─────────────────────────┐    ┌──────────────────────┐
│   SUPABASE DATABASE     │    │   OPENAI GPT-4 API   │
│                         │    │                      │
│  ┌──────────────────┐   │    │  - Chat Completion   │
│  │  user_profiles   │   │    │  - Quiz Generation   │
│  │  quizzes         │   │    │  - Note Summary      │
│  │  quiz_attempts   │   │    │  - Study Plans       │
│  │  mindmaps        │   │    │                      │
│  │  notes           │   │    └──────────────────────┘
│  │  study_plans     │   │
│  │  study_sessions  │   │
│  │  chat_convos     │   │
│  │  activities      │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

---

## Request Flow

### Example: User Takes a Quiz

```
1. USER clicks "Start Quiz" button
   ↓
2. FRONTEND sends POST /api/quiz/generate
   ↓
3. BACKEND routes to quiz_routes.py
   ↓
4. quiz_controller.py validates request
   ↓
5. ai_tutor_service.py calls OpenAI API
   ↓
6. GPT-4 generates quiz questions
   ↓
7. supabase_service.py saves quiz to DB
   ↓
8. Response returns to FRONTEND
   ↓
9. QuizMode.tsx displays questions
   ↓
10. USER submits answers
   ↓
11. BACKEND calculates score
   ↓
12. xp_service.py awards XP
   ↓
13. streak_service.py updates streak
   ↓
14. Database updated with results
   ↓
15. FRONTEND shows score + XP earned
```

---

## Component Hierarchy

```
App.tsx
└── ObsidianCore.tsx
    ├── IntroAnimation.tsx (first load)
    └── LoginScreen.tsx (if not authenticated)
    └── EnhancedDashboard.tsx (main app)
        ├── FloatingCommandBar.tsx
        ├── ProfileSection.tsx
        │   ├── Avatar
        │   ├── XP Bar
        │   └── Streak Counter
        ├── EnhancedChatInterface.tsx
        │   ├── Message List
        │   ├── Voice Input
        │   └── AI Response
        ├── EnhancedQuizMode.tsx
        │   ├── Camera Monitor
        │   ├── Question Display
        │   └── Results Screen
        ├── MindMapBuilder.tsx
        │   ├── Central Topic
        │   ├── Virtual Topics
        │   └── Side Summaries
        ├── NotesGenerator.tsx
        │   ├── Note Editor
        │   └── AI Summarize
        ├── StudyTimer.tsx
        │   ├── Pomodoro Clock
        │   └── Session Logger
        ├── StudyPlanner.tsx
        │   └── AI-Generated Plans
        ├── Leaderboard.tsx
        │   └── User Rankings
        └── AchievementsBadges.tsx
            └── Unlocked Badges
```

---

## Data Flow

### Authentication Flow
```
1. User signs up/logs in
2. Supabase Auth creates user
3. Backend creates user_profile row
4. JWT token issued
5. Token stored in localStorage
6. Token sent with all API requests
7. Backend validates token via middleware
```

### XP & Gamification Flow
```
1. User completes activity (quiz, study session, etc.)
2. Controller calls xp_service.award_xp()
3. XP calculated based on performance
4. user_profile.total_xp updated
5. Level calculated (100 XP per level)
6. Check for achievement unlocks
7. Update user_activities log
8. Return updated profile to frontend
```

### Streak Flow
```
1. User completes any activity
2. Backend checks last_activity_date
3. If same day: No change
4. If yesterday: current_streak++
5. If > 1 day gap: current_streak = 1
6. Update longest_streak if needed
7. Award bonus XP for milestone streaks
```

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - User logout

### AI Tutor
- `POST /api/tutor/chat` - Send message to AI tutor
- `GET /api/tutor/conversations` - Get chat history

### Quizzes
- `POST /api/quiz/generate` - Generate AI quiz
- `POST /api/quiz/submit` - Submit quiz answers
- `GET /api/quiz/history` - Get user's quiz history
- `GET /api/quiz/{id}` - Get specific quiz

### Mind Maps
- `POST /api/mindmap/create` - Create mind map
- `GET /api/mindmap/list` - List user's mind maps
- `PUT /api/mindmap/{id}` - Update mind map
- `DELETE /api/mindmap/{id}` - Delete mind map

### Notes
- `POST /api/notes/create` - Create note
- `GET /api/notes/list` - List user's notes
- `POST /api/notes/summarize` - AI summarize note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

### Study Plans
- `POST /api/study/plan/generate` - Generate AI study plan
- `GET /api/study/plan/list` - List study plans
- `PUT /api/study/plan/{id}/progress` - Update progress

### Study Timer
- `POST /api/study/session` - Log study session
- `GET /api/study/sessions` - Get session history

### User Profile
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/achievements` - Get achievements
- `GET /api/user/stats` - Get user statistics

### Leaderboard
- `GET /api/leaderboard/xp` - Top users by XP
- `GET /api/leaderboard/streak` - Top users by streak

---

## Database Schema

### user_profiles
```sql
- id (UUID, PK)
- user_id (UUID, FK to auth.users)
- email (TEXT)
- name (TEXT)
- avatar_url (TEXT)
- total_xp (INTEGER)
- current_streak (INTEGER)
- longest_streak (INTEGER)
- last_activity_date (DATE)
- preferences (JSONB)
```

### quizzes
```sql
- id (UUID, PK)
- title (TEXT)
- topic (TEXT)
- difficulty (TEXT: easy/medium/hard)
- questions (JSONB)
- created_by (UUID, FK)
```

### quiz_attempts
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- quiz_id (UUID, FK)
- score (INTEGER)
- percentage (NUMERIC)
- xp_earned (INTEGER)
- answers (JSONB)
```

---

## Security

### Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can only read their own data
- Users can only create/update/delete their own records
- Leaderboard queries use service role for read-only access

### Authentication Middleware
```python
@jwt_required
def protected_route():
    user_id = get_jwt_identity()
    # Only authenticated users can access
```

### CORS Configuration
```python
CORS(app, origins=[
    "http://localhost:5173",  # Frontend
    "http://localhost:5000"   # Backend
])
```

---

## Environment Configuration

### Frontend Environment
```
Vite runs on port 5173
Proxies /api/* to backend
No environment variables needed (uses backend API)
```

### Backend Environment
```
Flask runs on port 5000
Requires .env file with:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_KEY
  - OPENAI_API_KEY
  - SECRET_KEY
```

---

## Deployment Architecture

### Development (Current)
```
Frontend: npm run dev (Vite)
Backend: python app.py (Flask dev server)
Database: Supabase cloud
```

### Production (Future)
```
Frontend: Vercel/Netlify (Static hosting)
Backend: Heroku/Railway/Render (Python hosting)
Database: Supabase cloud (already production-ready)
```

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS 4.0** - Styling
- **Shadcn UI** - Component library
- **Motion** - Animations
- **Recharts** - Data visualization
- **Lucide** - Icons

### Backend
- **Flask 3.0** - Web framework
- **Python 3.8+** - Programming language
- **Supabase Python SDK** - Database client
- **OpenAI Python SDK** - AI integration
- **PyJWT** - Authentication tokens
- **Flask-CORS** - Cross-origin requests

### Database & Services
- **Supabase** - PostgreSQL database + Auth
- **OpenAI GPT-4** - AI language model
- **Row Level Security** - Data protection

---

## Performance Optimizations

1. **Database Indexes** - All foreign keys and frequently queried columns
2. **Query Limits** - Paginated results for large datasets
3. **Caching** - Frontend caches user profile and achievements
4. **Lazy Loading** - Components load on demand
5. **Code Splitting** - Vite automatically splits bundles
6. **Image Optimization** - Compressed assets
7. **API Debouncing** - Prevents excessive requests

---

## Scalability Considerations

- **Stateless Backend** - Can scale horizontally
- **Database Connection Pooling** - Efficient resource usage
- **API Rate Limiting** - Prevents abuse (can be added)
- **CDN for Static Assets** - Fast global delivery
- **Background Jobs** - Long-running tasks (future)
- **Caching Layer** - Redis for frequent queries (future)

---

## Error Handling

### Frontend
```typescript
try {
  const response = await fetch('/api/...')
  if (!response.ok) throw new Error()
} catch (error) {
  toast.error('Something went wrong')
}
```

### Backend
```python
@app.errorhandler(Exception)
def handle_error(error):
    return jsonify({'error': str(error)}), 500
```

---

## Monitoring & Logging

### Current
- Browser console logs (frontend)
- Flask console logs (backend)
- Supabase dashboard metrics

### Future
- Sentry for error tracking
- LogRocket for session replay
- Custom analytics dashboard

---

**This architecture supports millions of users with minimal changes! 🚀**

-- ================================================================
-- OBSIDIAN AI — Row Level Security Policies
-- IDEMPOTENT: Safe to re-run. Drops existing policies first.
-- ================================================================

-- ── Enable RLS on all tables ─────────────────────────────────────
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities    ENABLE ROW LEVEL SECURITY;

-- ── Drop existing policies (so re-running never errors) ──────────

-- user_profiles
DROP POLICY IF EXISTS "Users can view their own profile"   ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "profile_select"                     ON user_profiles;
DROP POLICY IF EXISTS "profile_insert"                     ON user_profiles;
DROP POLICY IF EXISTS "profile_update"                     ON user_profiles;

-- quizzes
DROP POLICY IF EXISTS "Anyone can view quizzes"                  ON quizzes;
DROP POLICY IF EXISTS "Authenticated users can create quizzes"   ON quizzes;
DROP POLICY IF EXISTS "quiz_select"                              ON quizzes;
DROP POLICY IF EXISTS "quiz_insert"                              ON quizzes;

-- quiz_attempts
DROP POLICY IF EXISTS "Users can view their own quiz attempts"   ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "attempt_select"                          ON quiz_attempts;
DROP POLICY IF EXISTS "attempt_insert"                          ON quiz_attempts;

-- mindmaps
DROP POLICY IF EXISTS "Users can view their own mind maps"   ON mindmaps;
DROP POLICY IF EXISTS "Users can insert their own mind maps" ON mindmaps;
DROP POLICY IF EXISTS "Users can update their own mind maps" ON mindmaps;
DROP POLICY IF EXISTS "Users can delete their own mind maps" ON mindmaps;
DROP POLICY IF EXISTS "mindmap_select"                       ON mindmaps;
DROP POLICY IF EXISTS "mindmap_insert"                       ON mindmaps;
DROP POLICY IF EXISTS "mindmap_update"                       ON mindmaps;
DROP POLICY IF EXISTS "mindmap_delete"                       ON mindmaps;

-- notes
DROP POLICY IF EXISTS "Users can view their own notes"   ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
DROP POLICY IF EXISTS "note_select"                      ON notes;
DROP POLICY IF EXISTS "note_insert"                      ON notes;
DROP POLICY IF EXISTS "note_update"                      ON notes;
DROP POLICY IF EXISTS "note_delete"                      ON notes;

-- study_plans
DROP POLICY IF EXISTS "Users can view their own study plans"   ON study_plans;
DROP POLICY IF EXISTS "Users can insert their own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can update their own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can delete their own study plans" ON study_plans;
DROP POLICY IF EXISTS "plan_select"                            ON study_plans;
DROP POLICY IF EXISTS "plan_insert"                            ON study_plans;
DROP POLICY IF EXISTS "plan_update"                            ON study_plans;
DROP POLICY IF EXISTS "plan_delete"                            ON study_plans;

-- study_sessions
DROP POLICY IF EXISTS "Users can view their own study sessions"   ON study_sessions;
DROP POLICY IF EXISTS "Users can insert their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "session_select"                           ON study_sessions;
DROP POLICY IF EXISTS "session_insert"                           ON study_sessions;

-- chat_conversations
DROP POLICY IF EXISTS "Users can view their own conversations"   ON chat_conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "chat_select"                              ON chat_conversations;
DROP POLICY IF EXISTS "chat_insert"                              ON chat_conversations;

-- user_activities
DROP POLICY IF EXISTS "Users can view their own activities"   ON user_activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON user_activities;
DROP POLICY IF EXISTS "activity_select"                       ON user_activities;
DROP POLICY IF EXISTS "activity_insert"                       ON user_activities;

-- ── Create fresh policies ────────────────────────────────────────

-- user_profiles: each user owns only their own row
CREATE POLICY "profile_select" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profile_insert" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_update" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- quizzes: anyone can read; authenticated users can create
CREATE POLICY "quiz_select" ON quizzes
    FOR SELECT USING (TRUE);

CREATE POLICY "quiz_insert" ON quizzes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- quiz_attempts: users see and create only their own attempts
CREATE POLICY "attempt_select" ON quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "attempt_insert" ON quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- mindmaps: full CRUD on own rows only
CREATE POLICY "mindmap_select" ON mindmaps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "mindmap_insert" ON mindmaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mindmap_update" ON mindmaps
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "mindmap_delete" ON mindmaps
    FOR DELETE USING (auth.uid() = user_id);

-- notes: full CRUD on own rows only
CREATE POLICY "note_select" ON notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "note_insert" ON notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "note_update" ON notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "note_delete" ON notes
    FOR DELETE USING (auth.uid() = user_id);

-- study_plans: full CRUD on own rows only
CREATE POLICY "plan_select" ON study_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plan_insert" ON study_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plan_update" ON study_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "plan_delete" ON study_plans
    FOR DELETE USING (auth.uid() = user_id);

-- study_sessions: users see and create only their own sessions
CREATE POLICY "session_select" ON study_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "session_insert" ON study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- chat_conversations: users see and create only their own chats
CREATE POLICY "chat_select" ON chat_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chat_insert" ON chat_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_activities: users see and create only their own activity log
CREATE POLICY "activity_select" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "activity_insert" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

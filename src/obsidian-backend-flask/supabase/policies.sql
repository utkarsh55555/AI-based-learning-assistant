-- Enable Row Level Security (RLS) on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Quizzes Policies (public read, authenticated create)
CREATE POLICY "Anyone can view quizzes"
    ON quizzes FOR SELECT
    USING (TRUE);

CREATE POLICY "Authenticated users can create quizzes"
    ON quizzes FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Quiz Attempts Policies
CREATE POLICY "Users can view their own quiz attempts"
    ON quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Mind Maps Policies
CREATE POLICY "Users can view their own mind maps"
    ON mindmaps FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mind maps"
    ON mindmaps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mind maps"
    ON mindmaps FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mind maps"
    ON mindmaps FOR DELETE
    USING (auth.uid() = user_id);

-- Notes Policies
CREATE POLICY "Users can view their own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- Study Plans Policies
CREATE POLICY "Users can view their own study plans"
    ON study_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans"
    ON study_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans"
    ON study_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans"
    ON study_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Study Sessions Policies
CREATE POLICY "Users can view their own study sessions"
    ON study_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
    ON study_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Chat Conversations Policies
CREATE POLICY "Users can view their own conversations"
    ON chat_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
    ON chat_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User Activities Policies
CREATE POLICY "Users can view their own activities"
    ON user_activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
    ON user_activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

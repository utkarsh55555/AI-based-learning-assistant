-- ================================================================
-- OBSIDIAN AI — Complete Database Schema
-- Run this entire block in: Supabase → SQL Editor → New Query
-- ================================================================

-- Enable UUID extension (needed for auto-generated IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. USER PROFILES ─────────────────────────────────────────────
-- Stores everything about a logged-in user: name, XP, streak, role, etc.
-- user_id links directly to Supabase Auth (auth.users) — auto-managed by Supabase
CREATE TABLE IF NOT EXISTS user_profiles (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email              TEXT NOT NULL,
    name               TEXT NOT NULL,
    avatar_url         TEXT,
    bio                TEXT,
    role               TEXT DEFAULT 'student' CHECK (role IN ('guest','student','teacher','admin')),
    preferences        JSONB DEFAULT '{}'::jsonb,
    total_xp           INTEGER DEFAULT 0,
    current_streak     INTEGER DEFAULT 0,
    longest_streak     INTEGER DEFAULT 0,
    last_activity_date DATE,
    is_new_user        BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2. QUIZZES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       TEXT NOT NULL,
    topic       TEXT NOT NULL,
    difficulty  TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    questions   JSONB NOT NULL,
    created_by  UUID REFERENCES auth.users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3. QUIZ ATTEMPTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quiz_id            UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
    score              INTEGER NOT NULL,
    total_questions    INTEGER NOT NULL,
    percentage         NUMERIC(5,2) NOT NULL,
    time_taken_seconds INTEGER,
    answers            JSONB NOT NULL,
    results            JSONB NOT NULL,
    xp_earned          INTEGER DEFAULT 0,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 4. MIND MAPS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mindmaps (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title        TEXT NOT NULL,
    topics       JSONB DEFAULT '[]'::jsonb,
    ai_generated BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 5. NOTES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    tags       TEXT[] DEFAULT '{}',
    subject    TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 6. STUDY PLANS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_plans (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject        TEXT NOT NULL,
    duration_weeks INTEGER NOT NULL,
    current_level  TEXT,
    plan           JSONB NOT NULL,
    progress       NUMERIC(5,2) DEFAULT 0,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 7. STUDY SESSIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_sessions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    subject          TEXT,
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 8. CHAT CONVERSATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    messages   JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 9. USER ACTIVITIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_activities (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL,
    details       JSONB DEFAULT '{}'::jsonb,
    xp_earned     INTEGER DEFAULT 0,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── PERFORMANCE INDEXES ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id    ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_id         ON mindmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id            ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_tags               ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id   ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id  ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_xp   ON user_profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_streak     ON user_profiles(current_streak DESC);

-- ── AUTO-UPDATE updated_at TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_mindmaps_updated_at
    BEFORE UPDATE ON mindmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_study_plans_updated_at
    BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

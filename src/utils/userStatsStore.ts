// ─────────────────────────────────────────────────────────────────────────────
//  userStatsStore.ts  –  Per-user activity tracking via localStorage and cloud
// ─────────────────────────────────────────────────────────────────────────────
import { userAPI } from "./api";

export interface ActivityItem {
  id: string;
  type: "chat" | "quiz" | "study" | "note" | "mindmap" | "achievement";
  title: string;
  subtitle: string;
  xpEarned: number;
  timestamp: string; // ISO string
}

export interface QuizResult {
  id: string;
  topic: string;
  score: number;
  total: number;
  percentage: number;
  xpEarned: number;
  timestamp: string;
}

export interface StudySession {
  id: string;
  subject: string;
  minutes: number;
  xpEarned: number;
  timestamp: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  startedAt: string;
  messages: ChatMessage[];
  messageCount: number;
  title: string; // first user message trimmed
}

export interface WeeklyEntry {
  date: string;   // YYYY-MM-DD
  day: string;    // Mon/Tue/…
  xp: number;
  minutes: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string; // ISO string when unlocked
}

export interface TopicProgress {
  topic: string;
  subject: string;
  quizAttempts: number;
  totalCorrect: number;
  totalQuestions: number;
  lastStudied: string;
}

export interface UserStats {
  userId: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;       // YYYY-MM-DD
  totalStudyMinutes: number;
  totalSessions: number;
  totalQuestions: number;
  correctAnswers: number;
  notesCreated: number;
  mindMapsCreated: number;
  topicProgress: TopicProgress[];
  weeklyActivity: WeeklyEntry[];
  achievements: Achievement[];
  recentActivity: ActivityItem[];
  chatSessions: ChatSession[];
  quizHistory: QuizResult[];
  studySessions: StudySession[];
  joinedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Achievement definitions
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ACHIEVEMENTS: Omit<Achievement, "unlockedAt">[] = [
  { id: "first_chat",      name: "First Steps",        description: "Send your first message to the AI tutor",    icon: "💬" },
  { id: "first_quiz",      name: "Quiz Taker",          description: "Complete your first quiz",                   icon: "🎯" },
  { id: "first_note",      name: "Note Maker",          description: "Create your first AI note",                  icon: "📝" },
  { id: "first_mindmap",   name: "Mind Mapper",         description: "Build your first mind map",                  icon: "🗺️" },
  { id: "first_session",   name: "Focus Starter",       description: "Complete your first study session",          icon: "⏰" },
  { id: "streak_3",        name: "On a Roll",           description: "Maintain a 3-day study streak",              icon: "🔥" },
  { id: "streak_7",        name: "Week Warrior",        description: "Maintain a 7-day study streak",              icon: "⚡" },
  { id: "streak_30",       name: "Dedication Master",   description: "Maintain a 30-day study streak",             icon: "🏆" },
  { id: "xp_500",          name: "XP Collector",        description: "Earn 500 total XP",                          icon: "⭐" },
  { id: "xp_2000",         name: "XP Champion",         description: "Earn 2000 total XP",                         icon: "🌟" },
  { id: "xp_5000",         name: "XP Legend",           description: "Earn 5000 total XP",                         icon: "💫" },
  { id: "questions_50",    name: "Knowledge Seeker",    description: "Answer 50 questions",                        icon: "🧠" },
  { id: "questions_200",   name: "Quiz Master",         description: "Answer 200 questions",                       icon: "🎓" },
  { id: "accuracy_80",     name: "Sharp Mind",          description: "Achieve 80%+ quiz accuracy (min 10 q)",      icon: "🎯" },
  { id: "perfect_score",   name: "Perfect Score",       description: "Score 100% on any quiz",                     icon: "💯" },
  { id: "notes_5",         name: "Note Collector",      description: "Create 5 notes",                             icon: "📚" },
  { id: "notes_20",        name: "Note Master",         description: "Create 20 notes",                            icon: "📖" },
  { id: "study_60",        name: "Hour Scholar",        description: "Study for 60 total minutes",                 icon: "🕐" },
  { id: "study_600",       name: "Ten Hour Club",       description: "Study for 10 total hours",                   icon: "⏳" },
  { id: "chat_20",         name: "Curious Mind",        description: "Send 20 messages to the AI tutor",           icon: "🤔" },
  { id: "level_5",         name: "Level 5 Reached",     description: "Reach level 5",                              icon: "🚀" },
  { id: "level_10",        name: "Level 10 Reached",    description: "Reach level 10",                             icon: "👑" },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Helper utilities
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = (userId: string) => `obsidian_stats_${userId}`;

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function dayName(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr + "T00:00:00").getDay()];
}

/**
 * XP thresholds for each level.
 * Level = index + 1. e.g. level 1 needs 0 XP, level 2 needs 100 XP, etc.
 */
export function computeLevel(xp: number): number {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  return level;
}

export function xpForNextLevel(xp: number): { current: number; needed: number; levelXp: number } {
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];
  const level = computeLevel(xp);
  const currentLevelXp = thresholds[Math.min(level - 1, thresholds.length - 1)] || 0;
  const nextLevelXp = thresholds[Math.min(level, thresholds.length - 1)] || currentLevelXp + 2500;
  return {
    current: xp - currentLevelXp,
    needed: nextLevelXp - currentLevelXp,
    levelXp: nextLevelXp
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Default initial stats
// ─────────────────────────────────────────────────────────────────────────────
function defaultStats(userId: string): UserStats {
  return {
    userId,
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: "",
    totalStudyMinutes: 0,
    totalSessions: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    notesCreated: 0,
    mindMapsCreated: 0,
    topicProgress: [],
    weeklyActivity: [],
    achievements: ALL_ACHIEVEMENTS.map(a => ({ ...a })),
    recentActivity: [],
    chatSessions: [],
    quizHistory: [],
    studySessions: [],
    joinedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Core read / write
// ─────────────────────────────────────────────────────────────────────────────
export function getUserStats(userId: string): UserStats {
  if (!userId) return defaultStats("anonymous");
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return defaultStats(userId);
    const parsed = JSON.parse(raw) as UserStats;
    
    // Safety for old versions of stats
    if (!parsed.achievements) parsed.achievements = [];
    if (!parsed.weeklyActivity) parsed.weeklyActivity = [];
    if (!parsed.recentActivity) parsed.recentActivity = [];
    if (!parsed.chatSessions) parsed.chatSessions = [];
    if (!parsed.quizHistory) parsed.quizHistory = [];
    if (!parsed.topicProgress) parsed.topicProgress = [];

    // Merge in any new achievements added after the user registered
    const existingIds = new Set(parsed.achievements.map(a => a.id));
    for (const ach of ALL_ACHIEVEMENTS) {
      if (!existingIds.has(ach.id)) {
        parsed.achievements.push({ ...ach });
      }
    }
    return parsed;
  } catch {
    return defaultStats(userId);
  }
}

// Debounce mechanism for cloud sync
const syncTimeouts: Record<string, NodeJS.Timeout> = {};

export function saveUserStats(userId: string, stats: UserStats): void {
  if (!userId) return;
  try {
    stats.level = computeLevel(stats.totalXp);
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(stats));
    // Broadcast a custom event so other components can re-render
    window.dispatchEvent(new CustomEvent("obsidian-stats-updated", { detail: { userId } }));
    
    // Auto-sync to cloud with debounce
    if (syncTimeouts[userId]) {
      clearTimeout(syncTimeouts[userId]);
    }
    syncTimeouts[userId] = setTimeout(() => {
      userAPI.updateProfile({ preferences: stats }).catch(e => {
        console.warn("Failed to sync stats to cloud:", e);
      });
    }, 2000); // 2 second debounce

  } catch (e) {
    console.warn("Failed to save user stats:", e);
  }
}

export function syncStatsFromServer(userId: string, serverStats: any): void {
  if (!userId || !serverStats) return;
  
  // Basic validation that it's a UserStats object
  if (typeof serverStats === 'object' && serverStats.userId === userId && typeof serverStats.totalXp === 'number') {
    try {
      localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(serverStats));
      // Broadcast update
      window.dispatchEvent(new CustomEvent("obsidian-stats-updated", { detail: { userId } }));
    } catch (e) {
      console.warn("Failed to sync stats from server:", e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Weekly activity helpers
// ─────────────────────────────────────────────────────────────────────────────
function ensureTodayEntry(weeklyActivity: WeeklyEntry[]): WeeklyEntry[] {
  const today = todayStr();
  const idx = weeklyActivity.findIndex(e => e.date === today);
  if (idx === -1) {
    weeklyActivity.push({ date: today, day: dayName(today), xp: 0, minutes: 0 });
  }
  // Keep only last 14 days
  return weeklyActivity
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

/** Returns exactly 7 entries (Mon–Sun this week or last 7 days) for charts */
export function getWeeklyChartData(userId: string): WeeklyEntry[] {
  const stats = getUserStats(userId);
  const activity = [...stats.weeklyActivity];

  // Build last-7-days rolling window
  const result: WeeklyEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const found = activity.find(e => e.date === dateStr);
    result.push(found ?? { date: dateStr, day: dayName(dateStr), xp: 0, minutes: 0 });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Streak management
// ─────────────────────────────────────────────────────────────────────────────
export function updateDailyStreak(userId: string): UserStats {
  const stats = getUserStats(userId);
  const today = todayStr();
  if (stats.lastStudyDate === today) return stats; // already updated today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];

  if (stats.lastStudyDate === yStr) {
    stats.currentStreak += 1;
  } else if (stats.lastStudyDate !== today) {
    stats.currentStreak = 1; // reset
  }

  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  stats.lastStudyDate = today;
  checkAndUnlockAchievements(stats);
  saveUserStats(userId, stats);
  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Achievement unlocking
// ─────────────────────────────────────────────────────────────────────────────
export function checkAndUnlockAchievements(stats: UserStats): string[] {
  const newly: string[] = [];
  const totalMsgs = stats.chatSessions.reduce((s, cs) => s + cs.messageCount, 0);
  const accuracy = stats.totalQuestions > 0
    ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0;
  const hasPerfect = stats.quizHistory.some(q => q.percentage === 100);

  const conditions: Record<string, boolean> = {
    first_chat:    totalMsgs >= 1,
    first_quiz:    stats.quizHistory.length >= 1,
    first_note:    stats.notesCreated >= 1,
    first_mindmap: stats.mindMapsCreated >= 1,
    first_session: stats.studySessions.length >= 1,
    streak_3:      stats.currentStreak >= 3,
    streak_7:      stats.currentStreak >= 7,
    streak_30:     stats.currentStreak >= 30,
    xp_500:        stats.totalXp >= 500,
    xp_2000:       stats.totalXp >= 2000,
    xp_5000:       stats.totalXp >= 5000,
    questions_50:  stats.totalQuestions >= 50,
    questions_200: stats.totalQuestions >= 200,
    accuracy_80:   stats.totalQuestions >= 10 && accuracy >= 80,
    perfect_score: hasPerfect,
    notes_5:       stats.notesCreated >= 5,
    notes_20:      stats.notesCreated >= 20,
    study_60:      stats.totalStudyMinutes >= 60,
    study_600:     stats.totalStudyMinutes >= 600,
    chat_20:       totalMsgs >= 20,
    level_5:       stats.level >= 5,
    level_10:      stats.level >= 10,
  };

  for (const ach of stats.achievements) {
    if (!ach.unlockedAt && conditions[ach.id]) {
      ach.unlockedAt = new Date().toISOString();
      newly.push(ach.name);
    }
  }
  return newly;
}

function addActivity(stats: UserStats, item: Omit<ActivityItem, "id" | "timestamp">): void {
  stats.recentActivity.unshift({
    ...item,
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
  });
  // Keep last 50 activities
  stats.recentActivity = stats.recentActivity.slice(0, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public recording functions
// ─────────────────────────────────────────────────────────────────────────────

/** Called when user sends or receives a chat message */
export function recordChatMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
  sessionId: string
): void {
  if (!userId) return;
  const stats = getUserStats(userId);

  let session = stats.chatSessions.find(s => s.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      messages: [],
      messageCount: 0,
      title: role === "user" ? content.slice(0, 60) : "AI Tutor Session",
    };
    stats.chatSessions.unshift(session);
    // Keep last 20 sessions
    stats.chatSessions = stats.chatSessions.slice(0, 20);
  }

  session.messages.push({ role, content, timestamp: new Date().toISOString() });
  session.messageCount = session.messages.length;

  if (role === "user") {
    // XP for asking a question
    const xp = 5;
    stats.totalXp += xp;

    // Update weekly chart
    stats.weeklyActivity = ensureTodayEntry(stats.weeklyActivity);
    const todayEntry = stats.weeklyActivity.find(e => e.date === todayStr())!;
    todayEntry.xp += xp;

    addActivity(stats, {
      type: "chat",
      title: "AI Tutor Chat",
      subtitle: content.slice(0, 60),
      xpEarned: xp,
    });

    updateDailyStreak(userId);
  }

  const newlyUnlocked = checkAndUnlockAchievements(stats);
  saveUserStats(userId, stats);

  // Return newly unlocked achievement names (caller can show toast)
  if (newlyUnlocked.length > 0) {
    window.dispatchEvent(new CustomEvent("obsidian-achievement", { detail: newlyUnlocked }));
  }
}

/** Called when a quiz is fully submitted */
export function recordQuizResult(
  userId: string,
  topic: string,
  score: number,
  total: number,
  xpFromApi?: number
): void {
  if (!userId) return;
  const stats = getUserStats(userId);

  const percentage = total > 0 ? (score / total) * 100 : 0;
  const xpEarned = xpFromApi ?? score * 50;

  const result: QuizResult = {
    id: Math.random().toString(36).slice(2),
    topic,
    score,
    total,
    percentage,
    xpEarned,
    timestamp: new Date().toISOString(),
  };

  stats.quizHistory.unshift(result);
  stats.quizHistory = stats.quizHistory.slice(0, 100);
  stats.totalXp += xpEarned;
  stats.totalQuestions += total;
  stats.correctAnswers += score;

  // Update topic progress
  const topicKey = topic.toLowerCase().trim();
  let tp = stats.topicProgress.find(t => t.topic.toLowerCase() === topicKey);
  if (!tp) {
    tp = { topic, subject: topic, quizAttempts: 0, totalCorrect: 0, totalQuestions: 0, lastStudied: "" };
    stats.topicProgress.push(tp);
  }
  tp.quizAttempts += 1;
  tp.totalCorrect += score;
  tp.totalQuestions += total;
  tp.lastStudied = new Date().toISOString();

  // Update weekly chart
  stats.weeklyActivity = ensureTodayEntry(stats.weeklyActivity);
  const todayEntry = stats.weeklyActivity.find(e => e.date === todayStr())!;
  todayEntry.xp += xpEarned;

  addActivity(stats, {
    type: "quiz",
    title: `Quiz: ${topic}`,
    subtitle: `${score}/${total} correct (${percentage.toFixed(0)}%)`,
    xpEarned,
  });

  updateDailyStreak(userId);
  const newlyUnlocked = checkAndUnlockAchievements(stats);
  saveUserStats(userId, stats);

  if (newlyUnlocked.length > 0) {
    window.dispatchEvent(new CustomEvent("obsidian-achievement", { detail: newlyUnlocked }));
  }
}

/** Called when a study timer session completes */
export function recordStudySession(
  userId: string,
  minutes: number,
  subject: string = "General Study"
): void {
  if (!userId) return;
  const stats = getUserStats(userId);

  const xpEarned = Math.floor(minutes * 2);

  const session: StudySession = {
    id: Math.random().toString(36).slice(2),
    subject,
    minutes,
    xpEarned,
    timestamp: new Date().toISOString(),
  };

  stats.studySessions.unshift(session);
  stats.studySessions = stats.studySessions.slice(0, 100);
  stats.totalStudyMinutes += minutes;
  stats.totalSessions += 1;
  stats.totalXp += xpEarned;

  // Update weekly chart
  stats.weeklyActivity = ensureTodayEntry(stats.weeklyActivity);
  const todayEntry = stats.weeklyActivity.find(e => e.date === todayStr())!;
  todayEntry.xp += xpEarned;
  todayEntry.minutes += minutes;

  addActivity(stats, {
    type: "study",
    title: `Study Session – ${subject}`,
    subtitle: `${minutes} minutes completed`,
    xpEarned,
  });

  updateDailyStreak(userId);
  const newlyUnlocked = checkAndUnlockAchievements(stats);
  saveUserStats(userId, stats);

  if (newlyUnlocked.length > 0) {
    window.dispatchEvent(new CustomEvent("obsidian-achievement", { detail: newlyUnlocked }));
  }
}

/** Called when a note is created */
export function recordNoteCreated(userId: string, title: string): void {
  if (!userId) return;
  const stats = getUserStats(userId);
  const xpEarned = 20;

  stats.notesCreated += 1;
  stats.totalXp += xpEarned;

  stats.weeklyActivity = ensureTodayEntry(stats.weeklyActivity);
  const todayEntry = stats.weeklyActivity.find(e => e.date === todayStr())!;
  todayEntry.xp += xpEarned;

  addActivity(stats, {
    type: "note",
    title: `Note Created`,
    subtitle: title.slice(0, 60),
    xpEarned,
  });

  updateDailyStreak(userId);
  const newlyUnlocked = checkAndUnlockAchievements(stats);
  saveUserStats(userId, stats);

  if (newlyUnlocked.length > 0) {
    window.dispatchEvent(new CustomEvent("obsidian-achievement", { detail: newlyUnlocked }));
  }
}

/** Called when a mind map is created/saved */
export function recordMindMapCreated(userId: string, title: string): void {
  if (!userId) return;
  const stats = getUserStats(userId);
  const xpEarned = 25;

  stats.mindMapsCreated += 1;
  stats.totalXp += xpEarned;

  stats.weeklyActivity = ensureTodayEntry(stats.weeklyActivity);
  const todayEntry = stats.weeklyActivity.find(e => e.date === todayStr())!;
  todayEntry.xp += xpEarned;

  addActivity(stats, {
    type: "mindmap",
    title: `Mind Map Created`,
    subtitle: title.slice(0, 60),
    xpEarned,
  });

  updateDailyStreak(userId);
  const newlyUnlocked = checkAndUnlockAchievements(stats);
  saveUserStats(userId, stats);

  if (newlyUnlocked.length > 0) {
    window.dispatchEvent(new CustomEvent("obsidian-achievement", { detail: newlyUnlocked }));
  }
}

/** Hook-friendly: listen for stats updates across tabs */
export function onStatsUpdated(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("obsidian-stats-updated", handler);
  return () => window.removeEventListener("obsidian-stats-updated", handler);
}

/** Compute recent topics (last 5 unique topics practiced) with progress */
export function getRecentTopics(userId: string): {
  topic: string;
  subject: string;
  accuracy: number;
  attempts: number;
  lastStudied: string;
}[] {
  const stats = getUserStats(userId);
  return stats.topicProgress
    .sort((a, b) => new Date(b.lastStudied).getTime() - new Date(a.lastStudied).getTime())
    .slice(0, 5)
    .map(tp => ({
      topic: tp.topic,
      subject: tp.subject,
      accuracy: tp.totalQuestions > 0 ? Math.round((tp.totalCorrect / tp.totalQuestions) * 100) : 0,
      attempts: tp.quizAttempts,
      lastStudied: tp.lastStudied,
    }));
}

/** Compute weak topics (accuracy < 70%, min 1 attempt) */
export function getWeakTopics(userId: string): {
  topic: string;
  subject: string;
  accuracy: number;
}[] {
  const stats = getUserStats(userId);
  return stats.topicProgress
    .filter(tp => tp.totalQuestions > 0 && (tp.totalCorrect / tp.totalQuestions) * 100 < 70)
    .sort((a, b) => (a.totalCorrect / a.totalQuestions) - (b.totalCorrect / b.totalQuestions))
    .slice(0, 3)
    .map(tp => ({
      topic: tp.topic,
      subject: tp.subject,
      accuracy: Math.round((tp.totalCorrect / tp.totalQuestions) * 100),
    }));
}

/** Total messages sent (user only) */
export function getTotalMessages(userId: string): number {
  const stats = getUserStats(userId);
  return stats.chatSessions.reduce((sum, cs) => {
    return sum + cs.messages.filter(m => m.role === "user").length;
  }, 0);
}

/** Get overall quiz accuracy (0-100) */
export function getAccuracy(userId: string): number {
  const stats = getUserStats(userId);
  if (stats.totalQuestions === 0) return 0;
  return Math.round((stats.correctAnswers / stats.totalQuestions) * 100);
}

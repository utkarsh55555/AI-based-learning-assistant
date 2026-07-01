import { useState, useEffect, useCallback } from "react";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Trophy, Target, Flame, BookOpen, Brain, Zap, TrendingUp, Clock, Star, ArrowRight, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  getUserStats,
  getWeeklyChartData,
  getRecentTopics,
  getWeakTopics,
  xpForNextLevel,
  onStatsUpdated,
  getAccuracy,
  getTotalMessages,
  type UserStats,
} from "../utils/userStatsStore";

const motivationalQuotes = [
  "The expert in anything was once a beginner. Keep pushing forward! 🚀",
  "Success is the sum of small efforts repeated day in and day out. 💪",
  "Don't watch the clock; do what it does. Keep going! ⏰",
  "The secret of getting ahead is getting started. 🎯",
  "Believe you can and you're halfway there. ⭐",
  "Learning is not attained by chance, it must be sought with ardor. 🔥",
  "The capacity to learn is a gift; the ability to learn is a skill. 🧠",
];

interface EnhancedDashboardProps {
  userName?: string;
  isNewUser?: boolean;
  userId?: string;
}

export function EnhancedDashboard({ userName = "Scholar", isNewUser = false, userId = "" }: EnhancedDashboardProps = {}) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; xp: number; minutes: number }[]>([]);
  const [recentTopics, setRecentTopics] = useState<ReturnType<typeof getRecentTopics>>([]);
  const [weakTopics, setWeakTopics] = useState<ReturnType<typeof getWeakTopics>>([]);

  const loadData = useCallback(() => {
    if (!userId) return;
    const s = getUserStats(userId);
    setStats(s);
    setWeeklyData(getWeeklyChartData(userId));
    setRecentTopics(getRecentTopics(userId));
    setWeakTopics(getWeakTopics(userId));
  }, [userId]);

  useEffect(() => {
    loadData();
    const unsubscribe = onStatsUpdated(loadData);
    return unsubscribe;
  }, [loadData]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const accuracy = getAccuracy(userId);
  const totalMsgs = getTotalMessages(userId);
  const xpInfo = xpForNextLevel(stats.totalXp);
  const todayQuote = motivationalQuotes[new Date().getDay()];
  const studyHours = (stats.totalStudyMinutes / 60).toFixed(1);

  const statCards = [
    {
      label: "Learning Streak",
      value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
      sub: stats.currentStreak === 0 ? "Start today!" : `Best: ${stats.longestStreak} days`,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-600/20",
      borderColor: "border-orange-600/30",
    },
    {
      label: "Topics Practiced",
      value: String(stats.topicProgress.length),
      sub: `${recentTopics.length} this week`,
      icon: Brain,
      color: "text-blue-400",
      bgColor: "bg-blue-600/20",
      borderColor: "border-blue-600/30",
    },
    {
      label: "Total XP",
      value: stats.totalXp.toLocaleString(),
      sub: `Level ${stats.level}`,
      icon: Zap,
      color: "text-yellow-500",
      bgColor: "bg-yellow-600/20",
      borderColor: "border-yellow-600/30",
    },
    {
      label: "Study Hours",
      value: `${studyHours}h`,
      sub: `${stats.totalSessions} session${stats.totalSessions !== 1 ? "s" : ""}`,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-600/20",
      borderColor: "border-blue-600/30",
    },
  ];

  const unlockedAchievements = stats.achievements.filter(a => a.unlockedAt);
  const recentAchievements = [...stats.achievements]
    .sort((a, b) => {
      if (a.unlockedAt && b.unlockedAt) return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      if (a.unlockedAt) return -1;
      return 1;
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl border-blue-600/20 hover:border-blue-500/40 transition-all duration-500"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <motion.h2
              className="text-3xl mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {isNewUser ? `Welcome, ${userName}! 🎉` : `Welcome back, ${userName}! 👋`}
            </motion.h2>
            <motion.p
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {new Date().getHours() < 12 ? "Good morning!" : new Date().getHours() < 18 ? "Good afternoon!" : "Good evening!"}
              {" "}
              {isNewUser
                ? "Let's start your learning journey! 🚀"
                : stats.currentStreak > 0
                ? `You're on a ${stats.currentStreak}-day streak. Keep it up!`
                : "Ready to continue your learning journey?"}
            </motion.p>
          </div>

          {/* XP Progress */}
          <div className="flex items-center gap-4">
            <div className="text-right min-w-[120px]">
              <p className="text-sm text-muted-foreground mb-1">Level {stats.level} Progress</p>
              <Progress
                value={(xpInfo.current / xpInfo.needed) * 100}
                className="h-2 mb-1"
              />
              <p className="text-xs text-muted-foreground">
                {xpInfo.current.toLocaleString()} / {xpInfo.needed.toLocaleString()} XP
              </p>
            </div>
            <div className="w-16 h-16 rounded-full gradient-blue flex items-center justify-center pulse-glow neon-border flex-shrink-0">
              <div className="text-center">
                <Trophy className="w-5 h-5 text-white mx-auto" />
                <span className="text-xs text-white font-bold">{stats.level}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`glass-card p-6 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:-translate-y-1 transition-all duration-300 cursor-pointer ${stat.bgColor} border ${stat.borderColor}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl mb-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
                <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly XP Chart */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <h3 className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Weekly XP Earned
            </h3>
            {weeklyData.some(d => d.xp > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1A1A",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "8px",
                    }}
                    formatter={(val: number) => [`${val} XP`, "XP Earned"]}
                  />
                  <Line type="monotone" dataKey="xp" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Zap className="w-10 h-10 opacity-30" />
                <p className="text-sm">No XP earned yet this week</p>
                <p className="text-xs">Start chatting, quizzing, or studying!</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Weekly Study Hours Chart */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <h3 className="mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Study Minutes This Week
            </h3>
            {weeklyData.some(d => d.minutes > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1A1A",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      borderRadius: "8px",
                    }}
                    formatter={(val: number) => [`${val} min`, "Minutes"]}
                  />
                  <Bar dataKey="minutes" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Clock className="w-10 h-10 opacity-30" />
                <p className="text-sm">No study sessions recorded yet</p>
                <p className="text-xs">Use the Focus Timer to track study time</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Recent Topics + Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Topics */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Recent Topics
              </h3>
              <Badge variant="outline" className="text-xs bg-blue-600/10 border-blue-600/30 text-blue-400">
                {stats.topicProgress.length} total
              </Badge>
            </div>

            {recentTopics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <Brain className="w-10 h-10 opacity-30" />
                <p className="text-sm">No topics practiced yet</p>
                <p className="text-xs">Take a quiz to start tracking topics!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTopics.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-muted-foreground">{item.subject}</p>
                          <Badge variant="outline" className="text-xs">
                            {item.attempts} attempt{item.attempts !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <p>{item.topic}</p>
                      </div>
                      <span className={`text-sm ${item.accuracy >= 70 ? "text-green-400" : "text-orange-400"}`}>
                        {item.accuracy}%
                      </span>
                    </div>
                    <Progress value={item.accuracy} className="h-2" />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Achievements
              </h3>
              <Badge variant="outline" className="text-xs bg-yellow-600/10 border-yellow-600/30 text-yellow-400">
                {unlockedAchievements.length} / {stats.achievements.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {recentAchievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className={`p-3 rounded-lg border transition-all ${
                    achievement.unlockedAt
                      ? "bg-blue-600/10 border-blue-600/30"
                      : "bg-white/5 border-white/10 opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <p className="text-sm mb-1">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                    {achievement.unlockedAt && (
                      <Badge className="bg-green-600/20 border-green-600/50 text-green-400 text-xs">✓</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Weak Topics – only show when user has data */}
      {weakTopics.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="glass-card p-6 border-2 border-orange-600/30 bg-orange-900/10">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-orange-400" />
              <h3>Topics Needing Practice</h3>
              <Badge variant="outline" className="ml-auto bg-orange-600/20 border-orange-600/50 text-orange-400">
                AI Recommendations
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weakTopics.map((topic, index) => (
                <Card key={index} className="glass-card p-4">
                  <p className="text-sm text-muted-foreground mb-1">{topic.subject}</p>
                  <p className="mb-3">{topic.topic}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Quiz Accuracy</span>
                    <span className="text-sm text-orange-400">{topic.accuracy}%</span>
                  </div>
                  <Progress value={topic.accuracy} className="h-2 mb-3" />
                  <Button size="sm" variant="outline" className="w-full hover:bg-white/10">
                    Practice Now
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Extra Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <Card className="glass-card p-5 text-center bg-blue-600/10 border border-blue-600/30">
            <MessageSquare className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl mb-1">{totalMsgs}</p>
            <p className="text-xs text-muted-foreground">Messages to AI Tutor</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="glass-card p-5 text-center bg-green-600/10 border border-green-600/30">
            <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl mb-1">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Overall Quiz Accuracy</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <Card className="glass-card p-5 text-center bg-purple-600/10 border border-purple-600/30">
            <BookOpen className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl mb-1">{stats.notesCreated}</p>
            <p className="text-xs text-muted-foreground">Notes Created</p>
          </Card>
        </motion.div>
      </div>

      {/* Daily Motivation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card p-6 rounded-2xl border-2 border-blue-600/30 bg-gradient-to-r from-blue-900/20 to-blue-800/20"
      >
        <div className="text-center">
          <p className="text-sm text-blue-400 mb-2">💭 Daily Motivation</p>
          <p className="text-lg italic">"{todayQuote}"</p>
        </div>
      </motion.div>
    </div>
  );
}

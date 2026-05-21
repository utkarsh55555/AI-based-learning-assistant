import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Trophy, Target, Flame, BookOpen, Brain, Zap, TrendingUp, Clock, Star, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const weeklyData = [
  { day: "Mon", xp: 120, hours: 1.5 },
  { day: "Tue", xp: 180, hours: 2.2 },
  { day: "Wed", xp: 150, hours: 1.8 },
  { day: "Thu", xp: 240, hours: 3.0 },
  { day: "Fri", xp: 200, hours: 2.5 },
  { day: "Sat", xp: 320, hours: 4.0 },
  { day: "Sun", xp: 280, hours: 3.5 },
];

const motivationalQuotes = [
  "The expert in anything was once a beginner. Keep pushing forward! 🚀",
  "Success is the sum of small efforts repeated day in and day out. 💪",
  "Don't watch the clock; do what it does. Keep going! ⏰",
  "The secret of getting ahead is getting started. 🎯",
  "Believe you can and you're halfway there. ⭐",
];

interface EnhancedDashboardProps {
  userName?: string;
  isNewUser?: boolean;
}

export function EnhancedDashboard({ userName = "Scholar", isNewUser = false }: EnhancedDashboardProps = {}) {
  const stats = [
    { label: "Learning Streak", value: "7 days", icon: Flame, color: "text-orange-500", bgColor: "bg-orange-600/20", borderColor: "border-orange-600/30" },
    { label: "Topics Mastered", value: "12", icon: Brain, color: "text-blue-400", bgColor: "bg-blue-600/20", borderColor: "border-blue-600/30" },
    { label: "Total XP", value: "2,450", icon: Zap, color: "text-yellow-500", bgColor: "bg-yellow-600/20", borderColor: "border-yellow-600/30" },
    { label: "Study Hours", value: "18.5h", icon: Clock, color: "text-blue-500", bgColor: "bg-blue-600/20", borderColor: "border-blue-600/30" },
  ];

  const achievements = [
    { name: "Quick Learner", description: "Completed 5 topics in a week", unlocked: true, icon: "🎯" },
    { name: "Perfect Score", description: "Got 100% on a quiz", unlocked: true, icon: "💯" },
    { name: "Night Owl", description: "Study session after midnight", unlocked: true, icon: "🦉" },
    { name: "Consistency King", description: "Maintain 7-day streak", unlocked: true, icon: "🔥" },
    { name: "Century Club", description: "Earn 100+ XP in one day", unlocked: false, icon: "💪" },
    { name: "Scholar", description: "Master 10 different subjects", unlocked: false, icon: "📚" },
  ];

  const recentTopics = [
    { subject: "Mathematics", topic: "Calculus - Derivatives", progress: 85, color: "bg-blue-500", difficulty: "Medium" },
    { subject: "Physics", topic: "Quantum Mechanics", progress: 60, color: "bg-blue-600", difficulty: "Hard" },
    { subject: "Computer Science", topic: "Data Structures", progress: 95, color: "bg-green-500", difficulty: "Medium" },
    { subject: "Chemistry", topic: "Organic Chemistry", progress: 40, color: "bg-orange-500", difficulty: "Hard" },
  ];

  const weakTopics = [
    { subject: "Physics", topic: "Thermodynamics", accuracy: 45 },
    { subject: "Mathematics", topic: "Linear Algebra", accuracy: 52 },
    { subject: "Chemistry", topic: "Stoichiometry", accuracy: 58 },
  ];

  const todayQuote = motivationalQuotes[new Date().getDay()];

  return (
    <div className="space-y-6">
      {/* Welcome Section with Personalized Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl border-blue-600/20 hover:border-blue-500/40 transition-all duration-500"
      >
        <div className="flex items-center justify-between">
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
              {" "}{isNewUser ? "Let's start your learning journey! 🚀" : "Ready to continue your learning journey?"}
            </motion.p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Level</p>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-400" />
                <span className="text-2xl text-blue-400">8</span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-full gradient-blue flex items-center justify-center pulse-glow neon-border">
              <Star className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
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
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12% this week</span>
                  </div>
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
        {/* Weekly Progress Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <h3 className="mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Weekly Progress
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="xp" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Study Hours Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <h3 className="mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Study Hours This Week
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="hours" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Progress and Achievements Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Topics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Recent Topics
              </h3>
              <Button variant="ghost" size="sm" className="text-xs hover:bg-white/5 hover:scale-105 transition-all duration-200">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
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
                          {item.difficulty}
                        </Badge>
                      </div>
                      <p>{item.topic}</p>
                    </div>
                    <span className="text-sm text-blue-400">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card p-6 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Recent Achievements
              </h3>
              <Button variant="ghost" size="sm" className="text-xs hover:bg-white/5 hover:scale-105 transition-all duration-200">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className={`p-3 rounded-lg border transition-all hover:scale-102 ${
                    achievement.unlocked
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
                    {achievement.unlocked && (
                      <Badge className="bg-green-600/20 border-green-600/50 text-green-400 text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Weak Topics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
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
                  <span className="text-xs text-muted-foreground">Current Accuracy</span>
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

      {/* Daily Motivation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
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

import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Trophy, Target, Flame, BookOpen, Brain, Zap } from "lucide-react";
import { motion } from "motion/react";

export function Dashboard() {
  const stats = [
    { label: "Learning Streak", value: "7 days", icon: Flame, color: "text-orange-500" },
    { label: "Topics Mastered", value: "12", icon: Brain, color: "text-purple-500" },
    { label: "XP Earned", value: "2,450", icon: Zap, color: "text-yellow-500" },
    { label: "Study Hours", value: "18.5h", icon: BookOpen, color: "text-blue-500" },
  ];

  const achievements = [
    { name: "Quick Learner", description: "Completed 5 topics in a week", unlocked: true },
    { name: "Perfect Score", description: "Got 100% on a quiz", unlocked: true },
    { name: "Night Owl", description: "Study session after midnight", unlocked: true },
    { name: "Consistency King", description: "7-day learning streak", unlocked: false },
  ];

  const recentTopics = [
    { subject: "Mathematics", topic: "Calculus - Derivatives", progress: 85, color: "bg-blue-500" },
    { subject: "Physics", topic: "Quantum Mechanics", progress: 60, color: "bg-purple-500" },
    { subject: "Computer Science", topic: "Data Structures", progress: 95, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl mb-2">Welcome back, Scholar 👋</h2>
            <p className="text-muted-foreground">Ready to continue your learning journey?</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/20 border border-purple-600/30">
            <Trophy className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400">Level 8</span>
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
            <Card className="glass-card border-white/10 p-6 hover:border-purple-600/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Topics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card border-white/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-purple-500" />
              <h3 className="text-xl">Recent Topics</h3>
            </div>
            <div className="space-y-4">
              {recentTopics.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">{item.subject}</p>
                      <p>{item.topic}</p>
                    </div>
                    <span className="text-sm text-purple-400">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card border-white/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-xl">Achievements</h3>
            </div>
            <div className="space-y-3">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-all ${
                    achievement.unlocked
                      ? "bg-purple-600/10 border-purple-600/30"
                      : "bg-white/5 border-white/10 opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm mb-1">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                    {achievement.unlocked && (
                      <Badge className="bg-purple-600 text-white">
                        Unlocked
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Daily Motivation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 rounded-2xl border-2 border-purple-600/30 bg-gradient-to-r from-purple-900/20 to-violet-900/20"
      >
        <p className="text-center text-lg italic">
          "The expert in anything was once a beginner. Keep pushing forward! 🚀"
        </p>
      </motion.div>
    </div>
  );
}

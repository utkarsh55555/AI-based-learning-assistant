import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Trophy, Star, Zap, Target, BookOpen, Clock, Award, Lock } from "lucide-react";
import { motion } from "motion/react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  xpReward: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const achievements: Achievement[] = [
  {
    id: "first-steps",
    title: "First Steps",
    description: "Complete your first lesson",
    icon: <Star className="w-6 h-6" />,
    unlocked: true,
    progress: 1,
    maxProgress: 1,
    xpReward: 50,
    rarity: "common"
  },
  {
    id: "quiz-master",
    title: "Quiz Master",
    description: "Score 100% on any quiz",
    icon: <Trophy className="w-6 h-6" />,
    unlocked: true,
    progress: 1,
    maxProgress: 1,
    xpReward: 100,
    rarity: "rare"
  },
  {
    id: "week-warrior",
    title: "Week Warrior",
    description: "Maintain a 7-day learning streak",
    icon: <Zap className="w-6 h-6" />,
    unlocked: true,
    progress: 7,
    maxProgress: 7,
    xpReward: 150,
    rarity: "rare"
  },
  {
    id: "speed-demon",
    title: "Speed Demon",
    description: "Complete 10 rapid-fire quizzes",
    icon: <Target className="w-6 h-6" />,
    unlocked: false,
    progress: 3,
    maxProgress: 10,
    xpReward: 200,
    rarity: "epic"
  },
  {
    id: "bookworm",
    title: "Bookworm",
    description: "Generate 50 notes",
    icon: <BookOpen className="w-6 h-6" />,
    unlocked: false,
    progress: 12,
    maxProgress: 50,
    xpReward: 200,
    rarity: "epic"
  },
  {
    id: "time-master",
    title: "Time Master",
    description: "Complete 100 Pomodoro sessions",
    icon: <Clock className="w-6 h-6" />,
    unlocked: false,
    progress: 28,
    maxProgress: 100,
    xpReward: 300,
    rarity: "epic"
  },
  {
    id: "legend",
    title: "Learning Legend",
    description: "Reach Level 50",
    icon: <Award className="w-6 h-6" />,
    unlocked: false,
    progress: 8,
    maxProgress: 50,
    xpReward: 1000,
    rarity: "legendary"
  }
];

const rarityColors = {
  common: "bg-gray-600/20 border-gray-600/50 text-gray-300",
  rare: "bg-blue-600/20 border-blue-600/50 text-blue-400",
  epic: "bg-purple-600/20 border-purple-600/50 text-purple-400",
  legendary: "bg-yellow-600/20 border-yellow-600/50 text-yellow-400"
};

export function AchievementsBadges() {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalXP = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xpReward, 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl mb-2">Achievements & Badges</h2>
            <p className="text-muted-foreground">
              Track your learning milestones and unlock rewards
            </p>
          </div>
          <Trophy className="w-12 h-12 text-purple-400 float-animation" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Unlocked</p>
            <p className="text-2xl text-purple-400">{unlockedCount}/{achievements.length}</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">XP Earned</p>
            <p className="text-2xl text-purple-400">{totalXP}</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Completion</p>
            <p className="text-2xl text-purple-400">{Math.round((unlockedCount / achievements.length) * 100)}%</p>
          </Card>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement, idx) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              className={`glass-card p-6 relative overflow-hidden transition-all ${
                achievement.unlocked 
                  ? "hover:scale-105 hover:shadow-lg hover:shadow-purple-600/20" 
                  : "opacity-60"
              }`}
            >
              {/* Rarity Indicator */}
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className={`text-xs ${rarityColors[achievement.rarity]}`}>
                  {achievement.rarity}
                </Badge>
              </div>

              {/* Icon */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                achievement.unlocked
                  ? "bg-gradient-to-br from-purple-600 to-violet-800 pulse-glow"
                  : "bg-gray-600/20"
              }`}>
                {achievement.unlocked ? (
                  achievement.icon
                ) : (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                )}
              </div>

              {/* Title & Description */}
              <h3 className="mb-2">{achievement.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {achievement.description}
              </p>

              {/* Progress */}
              {!achievement.unlocked && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{achievement.progress}/{achievement.maxProgress}</span>
                  </div>
                  <Progress 
                    value={(achievement.progress / achievement.maxProgress) * 100} 
                    className="h-2" 
                  />
                </div>
              )}

              {/* XP Reward */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reward</span>
                <span className="text-purple-400">+{achievement.xpReward} XP</span>
              </div>

              {/* Unlocked Badge */}
              {achievement.unlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-3 right-3"
                >
                  <Badge className="bg-green-600/20 border-green-600/50 text-green-400">
                    ✓ Unlocked
                  </Badge>
                </motion.div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Achievements */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="mb-4">Recently Unlocked</h3>
        <div className="space-y-3">
          {achievements.filter(a => a.unlocked).slice(0, 3).map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card className="glass-card p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center flex-shrink-0">
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h4 className="mb-1">{achievement.title}</h4>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                </div>
                <Badge className="bg-purple-600/20 border-purple-600/50 text-purple-400">
                  +{achievement.xpReward} XP
                </Badge>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

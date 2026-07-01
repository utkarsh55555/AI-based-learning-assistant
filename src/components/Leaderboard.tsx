import { useState, useEffect, useMemo } from "react";
import { Card } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Trophy, Medal, TrendingUp, Star, Zap, Target } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getUserStats, onStatsUpdated, type UserStats } from "../utils/userStatsStore";

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  achievements: number;
  rank: number;
  weeklyXP: number;
}

const mockData: LeaderboardEntry[] = [ 
  {
    id: "2", 
    name: "Sarah Chen", 
    avatar: "https://images.unsplash.com/photo-1617223777538-5698e655a613?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZG9nJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU5OTY3MTQwfDA&ixlib=rb-4.1.0&q=80&w=400", 
    xp: 5280, 
    level: 12, 
    streak: 23, 
    achievements: 28, 
    rank: 1, 
    weeklyXP: 820 
  },
  { 
    id: "3", 
    name: "Alex Kumar", 
    avatar: "https://images.unsplash.com/photo-1738864720505-6bb1b83af524?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZm94JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYwMDMxNzA2fDA&ixlib=rb-4.1.0&q=80&w=400", 
    xp: 4150, 
    level: 11, 
    streak: 15, 
    achievements: 21, 
    rank: 2, 
    weeklyXP: 610 
  },
  { 
    id: "4", 
    name: "Emma Wilson", 
    avatar: "https://images.unsplash.com/photo-1688472977827-c7e446e49efe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcmFiYml0JTIwYnVubnl8ZW58MXx8fHwxNzYwMDMxNzA3fDA&ixlib=rb-4.1.0&q=80&w=400", 
    xp: 3890, 
    level: 10, 
    streak: 12, 
    achievements: 19, 
    rank: 3, 
    weeklyXP: 580 
  },
  { 
    id: "5", 
    name: "James Park", 
    avatar: "https://images.unsplash.com/photo-1590692464381-38f566ceaf7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcGFuZGElMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjAwMzE3MDd8MA&ixlib=rb-4.1.0&q=80&w=400", 
    xp: 2310, 
    level: 8, 
    streak: 8, 
    achievements: 11, 
    rank: 5, 
    weeklyXP: 380 
  },
  { 
    id: "6", 
    name: "Olivia Brown", 
    avatar: "https://images.unsplash.com/photo-1725998488050-956dc8743df9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwb3dsJTIwYmlyZHxlbnwxfHx8fDE3NjAwMzE3MDd8MA&ixlib=rb-4.1.0&q=80&w=400", 
    xp: 2180, 
    level: 7, 
    streak: 6, 
    achievements: 10, 
    rank: 6, 
    weeklyXP: 320 
  },
  { 
    id: "7", 
    name: "Liam Garcia", 
    avatar: "https://images.unsplash.com/photo-1654119109097-3094c13fc6ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcGVuZ3VpbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDAzMTcwOHww&ixlib=rb-4.1.0&q=80&w=400", 
    xp: 1950, 
    level: 7, 
    streak: 5, 
    achievements: 9, 
    rank: 7, 
    weeklyXP: 290 
  },
  { 
    id: "8", 
    name: "Sophia Lee", 
    avatar: "https://images.unsplash.com/photo-1633093823511-fa9d7d5699a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwYW5pbWFsJTIwYXZhdGFyfGVufDF8fHx8MTc2MDAzMTcwNXww&ixlib=rb-4.1.0&q=80&w=400", 
    xp: 1820, 
    level: 6, 
    streak: 4, 
    achievements: 8, 
    rank: 8, 
    weeklyXP: 260 
  },
];

interface LeaderboardProps {
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

export function Leaderboard({ userId = "", userName = "You", userAvatar = "" }: LeaderboardProps) {
  const [timeframe, setTimeframe] = useState<"all" | "weekly" | "monthly">("all");
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (userId) {
      setStats(getUserStats(userId));
      const unsub = onStatsUpdated(() => {
        setStats(getUserStats(userId));
      });
      return unsub;
    }
  }, [userId]);

  const leaderboardData = useMemo(() => {
    const data = [...mockData];
    
    let weeklyXP = 0;
    let totalXP = 0;
    let level = 1;
    let streak = 0;
    let achievements = 0;

    if (stats) {
      totalXP = stats.totalXp;
      level = stats.level;
      streak = stats.currentStreak;
      achievements = stats.achievements.filter(a => a.unlockedAt).length;
      weeklyXP = stats.weeklyActivity.reduce((sum, day) => sum + day.xp, 0);
    }

    // Add current user
    data.push({
      id: userId || "current-user",
      name: userName || "You",
      avatar: userAvatar || "https://images.unsplash.com/photo-1638639930738-11a71fca1b4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwY2F0JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYwMDI3NTQ2fDA&ixlib=rb-4.1.0&q=80&w=400",
      xp: totalXP,
      level: level,
      streak: streak,
      achievements: achievements,
      rank: 0,
      weeklyXP: weeklyXP
    });

    // Sort based on timeframe
    data.sort((a, b) => {
      if (timeframe === "weekly") return b.weeklyXP - a.weeklyXP;
      return b.xp - a.xp;
    });

    // Assign ranks
    data.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return data;
  }, [stats, timeframe, userId, userName, userAvatar]);

  const currentUserEntry = leaderboardData.find(e => e.id === (userId || "current-user")) || leaderboardData[0];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />;
      default:
        return <span className="text-lg">{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-600/20 border-yellow-600/50 text-yellow-400";
      case 2:
        return "bg-gray-600/20 border-gray-600/50 text-gray-300";
      case 3:
        return "bg-orange-600/20 border-orange-600/50 text-orange-400";
      default:
        return "bg-blue-600/20 border-blue-600/50 text-blue-400";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="glass-card p-6 rounded-xl mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl mb-2">Global Leaderboard</h2>
            <p className="text-muted-foreground">
              Compete with learners worldwide and climb the ranks!
            </p>
          </div>
          <Trophy className="w-12 h-12 text-blue-400 float-animation" />
        </div>

        {/* Timeframe Selector */}
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <TabsList className="grid w-full grid-cols-3 bg-input-background">
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {leaderboardData.slice(0, 3).sort((a, b) => a.rank - b.rank).map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`glass-card p-4 rounded-xl ${
              entry.rank === 1 ? "ring-2 ring-yellow-600/50" : ""
            }`}
            style={{ marginTop: entry.rank === 1 ? "0" : entry.rank === 2 ? "20px" : "40px" }}
          >
            <div className="text-center">
              <div className="flex justify-center mb-2">
                {getRankIcon(entry.rank)}
              </div>
              <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden neon-border ring-2 ring-blue-600/30">
                <ImageWithFallback
                  src={entry.avatar}
                  alt={entry.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="mb-1">{entry.name}</h4>
              <p className="text-sm text-muted-foreground mb-2">Level {entry.level}</p>
              <Badge className={getRankBadgeColor(entry.rank)}>
                {entry.xp.toLocaleString()} XP
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Full Rankings */}
      <div className="glass-card p-6 rounded-xl flex-1 overflow-hidden flex flex-col">
        <h3 className="mb-4">Rankings</h3>
        <div className="space-y-2 overflow-auto flex-1">
          {leaderboardData.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className={`p-4 ${
                  entry.id === (userId || "current-user")
                    ? "bg-blue-600/20 border-blue-600/50 ring-2 ring-blue-600/30"
                    : "glass-card"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-12 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar & Name */}
                  <div className="w-12 h-12 rounded-full overflow-hidden neon-border ring-2 ring-blue-600/30">
                    <ImageWithFallback
                      src={entry.avatar}
                      alt={entry.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="flex items-center gap-2">
                      {entry.name}
                      {entry.id === (userId || "current-user") && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">Level {entry.level}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-400" />
                      <span>{entry.xp.toLocaleString()} XP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400">🔥</span>
                      <span>{entry.streak} days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{entry.achievements}</span>
                    </div>
                  </div>

                  {/* Weekly Progress */}
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">+{entry.weeklyXP}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl mt-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Your Rank</p>
            <p className="text-xl">#{currentUserEntry.rank}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total XP</p>
            <p className="text-xl">{currentUserEntry.xp.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Streak</p>
            <p className="text-xl">{currentUserEntry.streak} 🔥</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Weekly XP</p>
            <p className="text-xl text-blue-400">+{currentUserEntry.weeklyXP.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

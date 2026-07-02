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

import { leaderboardAPI } from "../utils/api";
import { computeLevel } from "../utils/userStatsStore";

interface LeaderboardProps {
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

export function Leaderboard({ userId = "", userName = "You", userAvatar = "" }: LeaderboardProps) {
  const [timeframe, setTimeframe] = useState<"all" | "weekly" | "monthly">("all");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch local live stats
  useEffect(() => {
    if (userId) {
      setStats(getUserStats(userId));
      const unsub = onStatsUpdated(() => {
        setStats(getUserStats(userId));
      });
      return unsub;
    }
  }, [userId]);

  // Fetch global leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const data = await leaderboardAPI.getGlobal();
        if (Array.isArray(data)) {
          setGlobalUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const leaderboardData = useMemo(() => {
    const data: LeaderboardEntry[] = globalUsers.map(u => ({
      id: u.user_id?.toString() || Math.random().toString(),
      name: u.name || "Unknown User",
      avatar: u.avatar_url || "",
      xp: u.total_xp || 0,
      level: computeLevel(u.total_xp || 0),
      streak: u.current_streak || 0,
      achievements: 0,
      rank: 0,
      weeklyXP: 0 // Not fully supported globally yet
    }));
    
    let weeklyXP = 0;
    let totalXP = 0;
    let level = 1;
    let streak = 0;
    let achievements = 0;

    if (stats) {
      totalXP = stats.totalXp || 0;
      level = stats.level || 1;
      streak = stats.currentStreak || 0;
      achievements = (stats.achievements || []).filter(a => a.unlockedAt).length;
      weeklyXP = (stats.weeklyActivity || []).reduce((sum, day) => sum + (day.xp || 0), 0);
    }

    // Remove the current user if they are in the fetched global list (to replace with live stats)
    const filteredData = data.filter(u => u.id !== (userId || "current-user"));

    // Add current user with live stats
    filteredData.push({
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
    filteredData.sort((a, b) => {
      if (timeframe === "weekly") return b.weeklyXP - a.weeklyXP;
      return b.xp - a.xp;
    });

    // Assign ranks
    filteredData.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return filteredData;
  }, [stats, timeframe, userId, userName, userAvatar, globalUsers]);

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

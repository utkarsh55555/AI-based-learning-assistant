import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { ObsidianCore } from "./components/ObsidianCore";
import { LoginScreen } from "./components/LoginScreen";
import { EnhancedChatInterface } from "./components/EnhancedChatInterface";
import { EnhancedDashboard } from "./components/EnhancedDashboard";
import { EnhancedQuizMode } from "./components/EnhancedQuizMode";
import { StudyPlanner } from "./components/StudyPlanner";
import { NotesGenerator } from "./components/NotesGenerator";
import { MindMapBuilder } from "./components/MindMapBuilder";
import { Leaderboard } from "./components/Leaderboard";
import { StudyTimer } from "./components/StudyTimer";
import { ProfileSection } from "./components/ProfileSection";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  Calendar,
  User,
  Trophy,
  Settings,
  Sparkles,
  Menu,
  X,
  FileText,
  Map,
  Clock,
  Users,
  LogOut,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { authAPI } from "./utils/api";

type View = "landing" | "dashboard" | "chat" | "quiz" | "planner" | "notes" | "mindmap" | "leaderboard" | "timer" | "profile";

interface User {
  id?: string;
  name: string;
  email: string;
  isNewUser?: boolean;
  avatar?: string;
  total_xp?: number;
  current_streak?: number;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>("landing");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userAvatar, setUserAvatar] = useState("https://images.unsplash.com/photo-1638639930738-11a71fca1b4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwY2F0JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYwMDI3NTQ2fDA&ixlib=rb-4.1.0&q=80&w=400");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const currentUser = await authAPI.getCurrentUser();
          if (currentUser && currentUser.user) {
            const savedProfiles = JSON.parse(localStorage.getItem('customProfiles') || '{}');
            const profile = savedProfiles[currentUser.user.id] || {};
            setUser({
              id: currentUser.user.id,
              name: profile.name || currentUser.user.name || '',
              email: profile.email || currentUser.user.email,
              isNewUser: false,
              total_xp: currentUser.user.total_xp,
              current_streak: currentUser.user.current_streak
            });
            if (profile.avatar) {
              setUserAvatar(profile.avatar);
            }
            // setCurrentView("dashboard"); // Prevent skipping landing page
          }
        } catch (error) {
          // Token invalid or expired, clear storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const navItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
    { id: "chat" as View, label: "AI Tutor", icon: MessageSquare },
    { id: "quiz" as View, label: "Practice Quiz", icon: Brain },
    { id: "planner" as View, label: "Study Planner", icon: Calendar },
    { id: "notes" as View, label: "Notes", icon: FileText },
    { id: "mindmap" as View, label: "Mind Maps", icon: Map },
    { id: "timer" as View, label: "Focus Timer", icon: Clock },
    { id: "leaderboard" as View, label: "Leaderboard", icon: Users },
    { id: "profile" as View, label: "Profile", icon: User },
  ];

  const handleLogin = (userData: User) => {
    const savedProfiles = JSON.parse(localStorage.getItem('customProfiles') || '{}');
    const profile = savedProfiles[userData.id || ''] || {};
    
    setUser({ 
      ...userData, 
      name: profile.name || userData.name, 
      email: profile.email || userData.email 
    });
    
    if (profile.avatar) {
      setUserAvatar(profile.avatar);
    }
    
    setCurrentView("dashboard");

    // Welcome message with user's name - different for new vs returning users
    setTimeout(() => {
      const displayName = profile.name || userData.name;
      if (userData.isNewUser) {
        toast.success(`🎉 Welcome, ${displayName}!`, {
          description: "Let's start your learning journey together! 🚀"
        });
      } else {
        toast.success(`👋 Welcome back, ${displayName}!`, {
          description: "Ready to continue your learning journey?"
        });
      }
    }, 500);
  };

  const handleProfileUpdate = (updatedProfile: { name: string; email: string; avatar: string }) => {
    if (!user?.id) return;
    
    setUser({ ...user, name: updatedProfile.name, email: updatedProfile.email });
    setUserAvatar(updatedProfile.avatar);
    
    const savedProfiles = JSON.parse(localStorage.getItem('customProfiles') || '{}');
    savedProfiles[user.id] = {
      name: updatedProfile.name,
      email: updatedProfile.email,
      avatar: updatedProfile.avatar
    };
    localStorage.setItem('customProfiles', JSON.stringify(savedProfiles));
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="size-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setCurrentView("landing");
      toast.success("Logged out successfully");
    } catch (error: any) {
      console.error("Logout error:", error);
      // Still logout locally even if API call fails
      setUser(null);
      setCurrentView("landing");
      toast.info("Logged out");
    }
  };

  // Landing Page
  if (currentView === "landing") {
    return (
      <>
        <div className="size-full flex items-center justify-center relative overflow-hidden">
          {/* Stealth Blue Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#0F1419] to-[#0A0A0A]" />

          {/* Electric Blue Floating Particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: `rgba(59, 130, 246, ${0.2 + Math.random() * 0.3})`,
                  boxShadow: `0 0 ${4 + Math.random() * 4}px rgba(59, 130, 246, 0.5)`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center space-y-8 max-w-2xl px-6"
          >
            {/* Obsidian Core Animation */}
            <div className="flex justify-center">
              <ObsidianCore />
            </div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-6xl mb-4 bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]">
                Obsidian
              </h1>
              <p className="text-xl text-muted-foreground">
                Your Personal AI Learning Companion
              </p>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6 rounded-2xl max-w-lg mx-auto"
            >
              <p className="text-muted-foreground mb-4">
                Experience the future of learning with AI-powered tutoring, personalized study plans,
                adaptive practice questions, and gamified progress tracking. Master any subject with Obsidian by your side.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <div className="px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-sm hover:bg-blue-600/20 hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
                  <Sparkles className="w-3 h-3 inline mr-1 text-blue-400" />
                  AI Tutor
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-sm hover:bg-blue-600/20 hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
                  <Brain className="w-3 h-3 inline mr-1 text-blue-400" />
                  Smart Quizzes
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-sm hover:bg-blue-600/20 hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
                  <Trophy className="w-3 h-3 inline mr-1 text-blue-400" />
                  Gamification
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/30 text-sm hover:bg-blue-600/20 hover:border-blue-400/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
                  <Calendar className="w-3 h-3 inline mr-1 text-blue-400" />
                  Study Plans
                </div>
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={() => {
                  // Show login screen (user will be null, so login screen will show)
                  setCurrentView("dashboard");
                }}
                className="gradient-blue hover:opacity-90 px-8 py-6 text-lg pulse-glow neon-border relative overflow-hidden group"
              >
                <span className="relative z-10 font-semibold">{user ? "Go to Dashboard" : "Start Learning"}</span>
                <Sparkles className="w-5 h-5 ml-2 relative z-10" />
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </motion.div>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-muted-foreground"
            >
              Built by Utkarsh ✨
            </motion.p>
          </motion.div>
        </div>
        <Toaster position="top-right" />
      </>
    );
  }

  // Login Screen
  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toaster position="top-right" />
      </>
    );
  }

  // Main App Interface
  return (
    <>
      <div className="size-full flex bg-background">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 20 }}
              className="w-70 glass-card border-r border-white/10 flex flex-col"
            >
              {/* Logo/Header */}
              <div className="p-6 border-b border-blue-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center pulse-glow neon-border">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">Obsidian</h2>
                    <p className="text-xs text-muted-foreground">AI Learning</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2 overflow-auto">
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    variant={currentView === item.id ? "default" : "ghost"}
                    className={`w-full justify-start transition-all ${currentView === item.id
                        ? "gradient-blue hover:opacity-90 neon-border"
                        : "hover:bg-blue-950/30 hover:border-blue-800/30 border border-transparent"
                      }`}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Button>
                ))}
              </nav>

              {/* User Profile */}
              <div className="p-4 border-t border-blue-900/30">
                <div className="glass-card p-3 rounded-lg mb-3 border border-blue-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Level 8</span>
                    <Trophy className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="w-full bg-blue-950/50 rounded-full h-2 border border-blue-900/30">
                    <div className="gradient-blue h-2 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: "65%" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">2,450 / 4,000 XP</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1 hover:bg-white/5 justify-start gap-2 p-2"
                    onClick={() => setCurrentView("profile")}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden neon-border ring-2 ring-blue-600/30 flex-shrink-0">
                      <ImageWithFallback
                        src={userAvatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="truncate">{user.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3 hover:bg-white/5"
                    onClick={() => toast.info("Notifications coming soon!")}
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3 hover:bg-white/5"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="glass-card border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hover:bg-white/5"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
                <div>
                  <h1 className="text-2xl">
                    {navItems.find((item) => item.id === currentView)?.label || "Obsidian"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600/20 border border-orange-600/30">
                  <span className="text-orange-400 text-sm">🔥</span>
                  <span className="text-sm">7 day streak</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                  <Trophy className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">2,450 XP</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {currentView === "dashboard" && <EnhancedDashboard userName={user?.name} isNewUser={user?.isNewUser} />}
                {currentView === "chat" && <EnhancedChatInterface />}
                {currentView === "quiz" && <EnhancedQuizMode />}
                {currentView === "planner" && <StudyPlanner />}
                {currentView === "notes" && <NotesGenerator />}
                {currentView === "mindmap" && <MindMapBuilder onNavigate={setCurrentView} />}
                {currentView === "leaderboard" && <Leaderboard />}
                {currentView === "timer" && <StudyTimer />}
                {currentView === "profile" && <ProfileSection userName={user?.name} userEmail={user?.email} userAvatar={userAvatar} onProfileUpdate={handleProfileUpdate} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}

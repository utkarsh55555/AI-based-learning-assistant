import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar } from "./ui/avatar";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  User,
  Mail,
  Calendar,
  Trophy,
  Zap,
  Star,
  Camera,
  Edit,
  Save,
  X,
  Settings,
  Bell,
  Lock,
  Palette,
  Award,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";

interface ProfileSectionProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onAvatarChange?: (avatar: string) => void;
}

// Preset cute avatar options
const presetAvatars = [
  {
    id: "cat",
    name: "Cute Cat",
    url: "https://images.unsplash.com/photo-1638639930738-11a71fca1b4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwY2F0JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYwMDI3NTQ2fDA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: "dog",
    name: "Cute Dog",
    url: "https://images.unsplash.com/photo-1617223777538-5698e655a613?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZG9nJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzU5OTY3MTQwfDA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: "fox",
    name: "Cute Fox",
    url: "https://images.unsplash.com/photo-1738864720505-6bb1b83af524?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwZm94JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzYwMDMxNzA2fDA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: "rabbit",
    name: "Cute Rabbit",
    url: "https://images.unsplash.com/photo-1688472977827-c7e446e49efe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcmFiYml0JTIwYnVubnl8ZW58MXx8fHwxNzYwMDMxNzA3fDA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: "panda",
    name: "Cute Panda",
    url: "https://images.unsplash.com/photo-1590692464381-38f566ceaf7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcGFuZGElMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjAwMzE3MDd8MA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: "owl",
    name: "Cute Owl",
    url: "https://images.unsplash.com/photo-1725998488050-956dc8743df9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwb3dsJTIwYmlyZHxlbnwxfHx8fDE3NjAwMzE3MDd8MA&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: "penguin",
    name: "Cute Penguin",
    url: "https://images.unsplash.com/photo-1654119109097-3094c13fc6ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwcGVuZ3VpbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc2MDAzMTcwOHww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    id: "animal",
    name: "Cute Animal",
    url: "https://images.unsplash.com/photo-1633093823511-fa9d7d5699a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwYW5pbWFsJTIwYXZhdGFyfGVufDF8fHx8MTc2MDAzMTcwNXww&ixlib=rb-4.1.0&q=80&w=400",
  },
];

export function ProfileSection({ 
  userName = "User", 
  userEmail = "user@example.com",
  userAvatar,
  onAvatarChange
}: ProfileSectionProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(userAvatar || presetAvatars[0].url);
  const [editedName, setEditedName] = useState(userName);
  const [editedEmail, setEditedEmail] = useState(userEmail);

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully! 🎉");
    setIsEditingProfile(false);
  };

  const handleSelectAvatar = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    if (onAvatarChange) {
      onAvatarChange(avatarUrl);
    }
    setIsSelectingAvatar(false);
    toast.success("Avatar updated! 🎨");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload to a server/Supabase
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAvatar = event.target.result as string;
          setSelectedAvatar(newAvatar);
          if (onAvatarChange) {
            onAvatarChange(newAvatar);
          }
          toast.success("Custom avatar uploaded! 🎉");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full overflow-auto">
      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 rounded-xl mb-6"
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Avatar Section */}
          <div className="relative">
            <div className="relative w-32 h-32 rounded-full overflow-hidden neon-border ring-4 ring-blue-600/30">
              <ImageWithFallback
                src={selectedAvatar}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              size="icon"
              className="absolute bottom-0 right-0 rounded-full gradient-blue neon-border"
              onClick={() => setIsSelectingAvatar(true)}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            {isEditingProfile ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} className="gradient-blue">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                  <h2 className="text-3xl">{editedName}</h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditingProfile(true)}
                    className="hover:bg-white/5"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground mb-4 flex items-center gap-2 justify-center md:justify-start">
                  <Mail className="w-4 h-4" />
                  {editedEmail}
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge className="bg-blue-600/20 border-blue-600/50 text-blue-400">
                    <Trophy className="w-3 h-3 mr-1" />
                    Level 8
                  </Badge>
                  <Badge className="bg-yellow-600/20 border-yellow-600/50 text-yellow-400">
                    <Star className="w-3 h-3 mr-1" />
                    12 Achievements
                  </Badge>
                  <Badge className="bg-orange-600/20 border-orange-600/50 text-orange-400">
                    🔥 7 Day Streak
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass-card p-4 text-center">
              <Zap className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl mb-1">2,450</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </Card>
            <Card className="glass-card p-4 text-center">
              <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl mb-1">#4</p>
              <p className="text-xs text-muted-foreground">Rank</p>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Avatar Selection Modal */}
      {isSelectingAvatar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsSelectingAvatar(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-6 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl">Choose Your Avatar</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsSelectingAvatar(false)}
                className="hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Upload Custom Avatar */}
            <div className="mb-6">
              <Label
                htmlFor="avatar-upload"
                className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-blue-600/50 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-600/10 transition-all"
              >
                <Camera className="w-6 h-6 text-blue-400" />
                <span>Upload Custom Avatar</span>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Preset Avatars */}
            <div className="grid grid-cols-4 gap-4">
              {presetAvatars.map((avatar) => (
                <motion.button
                  key={avatar.id}
                  onClick={() => handleSelectAvatar(avatar.url)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedAvatar === avatar.url
                      ? "border-blue-400 ring-4 ring-blue-600/30"
                      : "border-blue-900/30 hover:border-blue-600/50"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ImageWithFallback
                    src={avatar.url}
                    alt={avatar.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedAvatar === avatar.url && (
                    <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Profile Tabs */}
      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-input-background">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Statistics Tab */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Learning Stats */}
            <Card className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400" />
                Learning Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Study Time</span>
                  <span>42 hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Questions Answered</span>
                  <span>567</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Accuracy Rate</span>
                  <span className="text-green-400">87%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Notes Created</span>
                  <span>34</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Flashcards Reviewed</span>
                  <span>289</span>
                </div>
              </div>
            </Card>

            {/* Activity Graph */}
            <Card className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Activity Overview
              </h3>
              <div className="space-y-3">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-sm w-12 text-muted-foreground">{day}</span>
                    <div className="flex-1 bg-blue-950/50 rounded-full h-4 border border-blue-900/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${40 + Math.random() * 60}%` }}
                        transition={{ delay: index * 0.1 }}
                        className="gradient-blue h-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="glass-card p-6 md:col-span-2">
              <h3 className="mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { action: "Completed Quiz", subject: "Mathematics", time: "2 hours ago", xp: 50 },
                  { action: "Created Flashcards", subject: "Biology", time: "5 hours ago", xp: 25 },
                  { action: "Study Session", subject: "Physics", time: "Yesterday", xp: 100 },
                  { action: "Achievement Unlocked", subject: "Week Warrior", time: "2 days ago", xp: 150 },
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-blue-950/20 border border-blue-900/30"
                  >
                    <div>
                      <p>{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.subject}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-blue-600/20 border-blue-600/50 text-blue-400 mb-1">
                        +{activity.xp} XP
                      </Badge>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "First Steps", desc: "Complete your first quiz", icon: "🎯", unlocked: true },
              { name: "Week Warrior", desc: "7 day study streak", icon: "🔥", unlocked: true },
              { name: "Knowledge Seeker", desc: "Answer 100 questions", icon: "🧠", unlocked: true },
              { name: "Note Master", desc: "Create 50 notes", icon: "📝", unlocked: false },
              { name: "Flash Card Pro", desc: "Review 500 flashcards", icon: "🎴", unlocked: false },
              { name: "Time Lord", desc: "Study for 100 hours", icon: "⏰", unlocked: false },
            ].map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`glass-card p-6 text-center ${
                    achievement.unlocked
                      ? "ring-2 ring-yellow-600/50"
                      : "opacity-50 grayscale"
                  }`}
                >
                  <div className="text-4xl mb-3">{achievement.icon}</div>
                  <h4 className="mb-2">{achievement.name}</h4>
                  <p className="text-sm text-muted-foreground">{achievement.desc}</p>
                  {achievement.unlocked && (
                    <Badge className="mt-3 bg-yellow-600/20 border-yellow-600/50 text-yellow-400">
                      Unlocked
                    </Badge>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Account Settings */}
            <Card className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Account Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p>Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about your progress
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Study Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to study daily
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p>Show on Leaderboard</p>
                    <p className="text-sm text-muted-foreground">
                      Display your rank publicly
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
              </div>
            </Card>

            {/* Privacy & Security */}
            <Card className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                Privacy & Security
              </h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Two-Factor Authentication
                </Button>
                <Button variant="outline" className="w-full justify-start text-red-400 hover:text-red-300">
                  Delete Account
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

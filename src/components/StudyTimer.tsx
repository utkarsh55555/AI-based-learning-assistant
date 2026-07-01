import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "../utils/useLocalStorage";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Play, Pause, RotateCcw, Clock, Coffee, Target, Volume2, VolumeX, Settings as SettingsIcon, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { recordStudySession } from "../utils/userStatsStore";

type TimerMode = "focus" | "short-break" | "long-break" | "mid-break";

interface TimerPreset {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

const presets: Record<string, TimerPreset> = {
  classic: { focus: 25, shortBreak: 5, longBreak: 15 },
  extended: { focus: 50, shortBreak: 10, longBreak: 20 },
  quick: { focus: 15, shortBreak: 3, longBreak: 10 },
};

interface Session {
  id: string;
  mode: TimerMode;
  duration: number;
  completedAt: Date;
}

export function StudyTimer({ userId = "" }: { userId?: string }) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [preset, setPreset] = useState<string>("classic");
  const [customDuration, setCustomDuration] = useState<number>(25);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(presets.classic.focus * 60);
  const [initialTime, setInitialTime] = useState(presets.classic.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useLocalStorage<Session[]>("studyTimerSessions", []);
  const [soundEnabled, setSoundEnabled] = useLocalStorage("studyTimerSound", true);
  const [pomodorosCompleted, setPomodorosCompleted] = useLocalStorage("studyTimerPomodoros", 0);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [hasPlayedMidBreak, setHasPlayedMidBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const currentPreset = presets[preset];
  const totalTime = isCustomMode && mode === "focus"
    ? customDuration * 60
    : mode === "focus" 
    ? currentPreset.focus * 60 
    : mode === "short-break" 
    ? currentPreset.shortBreak * 60 
    : mode === "long-break"
    ? currentPreset.longBreak * 60
    : calculateMidBreakDuration(initialTime);
  
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Calculate mid-break duration based on focus time
  function calculateMidBreakDuration(focusTimeInSeconds: number): number {
    const focusMinutes = focusTimeInSeconds / 60;
    if (focusMinutes <= 15) return 2 * 60; // 2 minutes
    if (focusMinutes <= 25) return 3 * 60; // 3 minutes
    if (focusMinutes <= 45) return 5 * 60; // 5 minutes
    return 7 * 60; // 7 minutes for longer sessions
  }

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          
          // Check if we've reached halfway point for mid-break
          if (mode === "focus" && !hasPlayedMidBreak) {
            const halfwayPoint = Math.floor(initialTime / 2);
            if (newTime === halfwayPoint) {
              handleMidBreak();
            }
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, mode, hasPlayedMidBreak, initialTime]);

  const handleMidBreak = () => {
    setHasPlayedMidBreak(true);
    setIsRunning(false);
    
    if (soundEnabled) {
      playSoothingBreakSound();
    }
    
    toast.info("🌿 Mid-session break time!", {
      description: "Take a moment to stretch and relax",
      duration: 5000,
    });
    
    // Auto-start mid-break
    setTimeout(() => {
      startMidBreak();
    }, 1000);
  };

  const startMidBreak = () => {
    const previousMode = mode;
    const remainingTime = timeLeft;
    
    setMode("mid-break");
    const midBreakDuration = calculateMidBreakDuration(initialTime);
    setTimeLeft(midBreakDuration);
    setIsRunning(true);
    
    // Store the state to resume after break
    const resumeTimer = () => {
      setMode(previousMode);
      setTimeLeft(remainingTime);
      setIsRunning(true);
    };
    
    // Set a timeout to auto-resume after mid-break
    setTimeout(() => {
      if (mode === "mid-break") {
        toast.success("Break over! Back to focus 💪");
        resumeTimer();
      }
    }, midBreakDuration * 1000);
  };

  const playSoothingBreakSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    const duration = 5; // 5 seconds
    
    // Create a gentle chime/bell sound
    const now = audioContext.currentTime;
    
    // First tone - A4 (440 Hz)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 440;
    osc1.type = "sine";
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc1.start(now);
    osc1.stop(now + duration);
    
    // Second tone - E5 (659.25 Hz) - delayed slightly for harmony
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 659.25;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration - 0.5);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + duration - 0.5);
    }, 500);
    
    // Third tone - A5 (880 Hz) - higher octave
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 880;
      osc3.type = "sine";
      gain3.gain.setValueAtTime(0.15, audioContext.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration - 1);
      osc3.start(audioContext.currentTime);
      osc3.stop(audioContext.currentTime + duration - 1);
    }, 1000);
  };

  const playCompletionSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    const duration = 7;
    
    // Create a more celebratory completion sound
    const now = audioContext.currentTime;
    
    // Ascending notes
    const frequencies = [523.25, 587.33, 659.25, 783.99]; // C5, D5, E5, G5
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 1.5);
      }, index * 300);
    });
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    setHasPlayedMidBreak(false);
    
    // Don't log mid-break sessions
    if (mode !== "mid-break") {
      const session: Session = {
        id: Date.now().toString(),
        mode,
        duration: totalTime / 60,
        completedAt: new Date(),
      };
      
      setSessions((prev) => [session, ...prev].slice(0, 10));
    }

    if (mode === "focus") {
      const newCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newCount);

      // Record real study session
      if (userId) {
        const focusMinutes = Math.round(totalTime / 60);
        recordStudySession(userId, focusMinutes, "Focus Session");
      }

      toast.success("🎉 Focus session complete! Great work!", {
        description: "Time for a break!"
      });

      // Auto switch to break
      if (newCount % 4 === 0) {
        switchMode("long-break");
      } else {
        switchMode("short-break");
      }
    } else if (mode !== "mid-break") {
      toast.success("Break time over! Ready to focus?", {
        description: "Start your next focus session"
      });
      switchMode("focus");
    }

    if (soundEnabled && mode !== "mid-break") {
      playCompletionSound();
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      toast.info("Timer started!");
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(totalTime);
    setInitialTime(totalTime);
    setHasPlayedMidBreak(false);
    toast.info("Timer reset");
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setHasPlayedMidBreak(false);
    let duration: number;
    
    if (newMode === "focus") {
      duration = isCustomMode ? customDuration * 60 : currentPreset.focus * 60;
    } else if (newMode === "short-break") {
      duration = currentPreset.shortBreak * 60;
    } else if (newMode === "long-break") {
      duration = currentPreset.longBreak * 60;
    } else {
      duration = calculateMidBreakDuration(initialTime);
    }
    
    setTimeLeft(duration);
    setInitialTime(duration);
  };

  const changePreset = (newPreset: string) => {
    setPreset(newPreset);
    setIsCustomMode(false);
    setIsRunning(false);
    setHasPlayedMidBreak(false);
    const duration = mode === "focus" 
      ? presets[newPreset].focus * 60 
      : mode === "short-break" 
      ? presets[newPreset].shortBreak * 60 
      : presets[newPreset].longBreak * 60;
    setTimeLeft(duration);
    setInitialTime(duration);
  };

  const applyCustomDuration = () => {
    if (customDuration < 1 || customDuration > 120) {
      toast.error("Please enter a duration between 1 and 120 minutes");
      return;
    }
    
    setIsCustomMode(true);
    setIsRunning(false);
    setHasPlayedMidBreak(false);
    const duration = customDuration * 60;
    setTimeLeft(duration);
    setInitialTime(duration);
    setMode("focus");
    setIsCustomDialogOpen(false);
    toast.success(`Custom timer set for ${customDuration} minutes!`);
  };

  const todaysSessions = sessions.filter(s => {
    const today = new Date();
    const sessionDate = new Date(s.completedAt);
    return sessionDate.toDateString() === today.toDateString();
  });

  const totalFocusTime = todaysSessions
    .filter(s => s.mode === "focus")
    .reduce((acc, s) => acc + s.duration, 0);

  return (
    <div className="h-full flex gap-6">
      {/* Main Timer */}
      <div className="flex-1 flex flex-col">
        <div className="glass-card p-8 rounded-xl mb-6 flex-1 flex flex-col items-center justify-center">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-8 flex-wrap justify-center">
            <Button
              variant={mode === "focus" ? "default" : "outline"}
              onClick={() => switchMode("focus")}
              className={mode === "focus" ? "gradient-blue" : ""}
            >
              <Target className="w-4 h-4 mr-2" />
              Focus
            </Button>
            <Button
              variant={mode === "short-break" ? "default" : "outline"}
              onClick={() => switchMode("short-break")}
              className={mode === "short-break" ? "gradient-blue" : ""}
            >
              <Coffee className="w-4 h-4 mr-2" />
              Short Break
            </Button>
            <Button
              variant={mode === "long-break" ? "default" : "outline"}
              onClick={() => switchMode("long-break")}
              className={mode === "long-break" ? "gradient-blue" : ""}
            >
              <Coffee className="w-4 h-4 mr-2" />
              Long Break
            </Button>
            
            {/* Custom Duration Button */}
            <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={isCustomMode ? "default" : "outline"}
                  className={isCustomMode ? "gradient-blue" : ""}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Custom
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-blue-600/30">
                <DialogHeader>
                  <DialogTitle>Custom Focus Duration</DialogTitle>
                  <DialogDescription>
                    Set your preferred focus session duration with automatic break scheduling.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="custom-duration">Duration (minutes)</Label>
                    <Input
                      id="custom-duration"
                      type="number"
                      min="1"
                      max="120"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(parseInt(e.target.value) || 25)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Enter a duration between 1-120 minutes. 
                      A break will automatically be scheduled at the halfway point.
                    </p>
                  </div>
                  
                  {/* Preview Break Info */}
                  <div className="p-4 bg-blue-600/10 rounded-lg border border-blue-600/30">
                    <p className="text-sm mb-2">With {customDuration} minute focus:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Mid-break at {Math.floor(customDuration / 2)} minutes</li>
                      <li>• Break duration: {Math.floor(calculateMidBreakDuration(customDuration * 60) / 60)} minutes</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={applyCustomDuration}
                    className="w-full gradient-blue"
                  >
                    Apply Custom Duration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Timer Display */}
          <motion.div
            className="relative mb-8"
            animate={{ scale: isRunning ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 1, repeat: isRunning ? Infinity : 0 }}
          >
            <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center relative overflow-hidden ${
              mode === "mid-break" 
                ? "bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/30"
                : "bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-600/30"
            }`}>
              {/* Animated background */}
              <motion.div
                className={`absolute inset-0 ${mode === "mid-break" ? "bg-green-600/10" : "bg-blue-600/10"}`}
                animate={{ 
                  opacity: isRunning ? [0.1, 0.3, 0.1] : 0.1 
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              <div className="relative z-10 text-center">
                <p className="text-6xl mb-2">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">
                  {mode === "mid-break" ? "Mid Break 🌿" : mode.replace("-", " ")}
                </p>
                {isCustomMode && mode === "focus" && (
                  <p className="text-xs text-blue-400 mt-1">Custom {customDuration}m</p>
                )}
              </div>
            </div>
          </motion.div>

          <Progress value={progress} className="w-full max-w-md h-2 mb-6" />

          {/* Mid-break indicator */}
          {mode === "focus" && !hasPlayedMidBreak && (
            <p className="text-xs text-muted-foreground mb-4">
              Mid-break scheduled at {Math.floor((initialTime / 60) / 2)} min mark 🌿
            </p>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={toggleTimer}
              className="gradient-blue hover:opacity-90 px-8 neon-border"
              disabled={mode === "mid-break"}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={resetTimer}
              className="hover:bg-white/10"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>

          {/* Settings */}
          <div className="flex gap-4 mt-8 items-center flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Select value={preset} onValueChange={changePreset} disabled={isCustomMode}>
                <SelectTrigger className="w-32 bg-input-background border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="extended">Extended</SelectItem>
                  <SelectItem value="quick">Quick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="hover:bg-white/10"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="glass-card p-6 rounded-xl">
          <h3 className="mb-4">Today's Progress</h3>
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-card p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Pomodoros</p>
              <p className="text-2xl text-blue-400">{todaysSessions.filter(s => s.mode === "focus").length}</p>
            </Card>
            <Card className="glass-card p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Focus Time</p>
              <p className="text-2xl text-blue-400">{Math.round(totalFocusTime)}m</p>
            </Card>
            <Card className="glass-card p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Sessions</p>
              <p className="text-2xl text-blue-400">{todaysSessions.length}</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Session History */}
      <div className="w-80 glass-card p-6 rounded-xl flex flex-col">
        <h3 className="mb-4">Recent Sessions</h3>
        <div className="space-y-2 overflow-auto flex-1">
          {sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No sessions yet</p>
              <p className="text-xs">Start your first focus session!</p>
            </div>
          ) : (
            sessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="glass-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {session.mode === "focus" ? (
                        <Target className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Coffee className="w-4 h-4 text-orange-400" />
                      )}
                      <div>
                        <p className="text-sm capitalize">{session.mode.replace("-", " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.completedAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{Math.round(session.duration)}m</p>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Motivation */}
        <div className="mt-4 p-4 bg-blue-600/10 rounded-lg border border-blue-600/30">
          <p className="text-sm text-center">
            💪 Keep going! Every session brings you closer to your goals.
          </p>
        </div>
      </div>
    </div>
  );
}

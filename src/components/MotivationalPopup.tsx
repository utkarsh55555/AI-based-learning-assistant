import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Trophy, Flame, Star, Zap } from "lucide-react";
import { Button } from "./ui/button";

const motivationalMessages = [
  { 
    icon: Flame, 
    title: "🔥 You're on fire!", 
    message: "7 day streak! Keep it up!",
    color: "from-orange-500 to-red-500"
  },
  { 
    icon: Trophy, 
    title: "💯 Perfect Score!", 
    message: "You aced that quiz!",
    color: "from-yellow-500 to-orange-500"
  },
  { 
    icon: Star, 
    title: "⭐ Level Up!", 
    message: "You've reached Level 8!",
    color: "from-blue-500 to-purple-500"
  },
  { 
    icon: Zap, 
    title: "⚡ Speed Demon!", 
    message: "Fastest quiz completion yet!",
    color: "from-blue-400 to-cyan-400"
  },
  { 
    icon: Sparkles, 
    title: "✨ You're crushing it!", 
    message: "5 topics mastered this week!",
    color: "from-purple-500 to-pink-500"
  },
];

interface MotivationalPopupProps {
  triggerCount?: number;
}

export function MotivationalPopup({ triggerCount = 0 }: MotivationalPopupProps) {
  const [show, setShow] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(motivationalMessages[0]);

  useEffect(() => {
    if (triggerCount > 0) {
      // Show random motivational message
      const randomMsg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      setCurrentMessage(randomMsg);
      setShow(true);

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setShow(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [triggerCount]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ type: "spring", damping: 15 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-96"
        >
          <div className={`glass-card rounded-2xl p-6 bg-gradient-to-r ${currentMessage.color} bg-opacity-10 border-2 shadow-[0_0_50px_rgba(59,130,246,0.4)]`}>
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShow(false)}
              className="absolute top-2 right-2 w-8 h-8 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Content */}
            <div className="flex items-start gap-4">
              {/* Animated Icon */}
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                className="w-16 h-16 rounded-full gradient-blue flex items-center justify-center"
                style={{
                  boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)"
                }}
              >
                <currentMessage.icon className="w-8 h-8 text-white" />
              </motion.div>

              {/* Text */}
              <div className="flex-1">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl mb-2"
                >
                  {currentMessage.title}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-muted-foreground"
                >
                  {currentMessage.message}
                </motion.p>
              </div>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 4, ease: "linear" }}
              className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full origin-left"
            />

            {/* Particles Effect */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-blue-400"
                style={{
                  left: `${20 + i * 10}%`,
                  top: "50%",
                }}
                animate={{
                  y: [-20, -60],
                  opacity: [1, 0],
                  scale: [1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { ObsidianCore } from "./ObsidianCore";

interface IntroAnimationProps {
  show: boolean;
  onComplete: () => void;
  userName?: string;
  isNewUser?: boolean;
}

export function IntroAnimation({ show, onComplete, userName = "Scholar", isNewUser = false }: IntroAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ 
            background: "linear-gradient(135deg, #0A0A0A 0%, #0F1419 50%, #1A2332 100%)"
          }}
        >
          {/* Electric Blue Particles */}
          <div className="absolute inset-0">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: `rgba(59, 130, 246, ${0.3 + Math.random() * 0.5})`,
                  boxShadow: `0 0 ${6 + Math.random() * 8}px rgba(59, 130, 246, 0.8)`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -50, 0],
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center">
            {/* Obsidian Core with Enhanced Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 100, 
                damping: 15,
                duration: 1 
              }}
              className="flex justify-center mb-8"
            >
              <div className="w-32 h-32 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 blur-2xl opacity-60 animate-pulse" />
                <div className="relative">
                  <ObsidianCore />
                </div>
              </div>
            </motion.div>

            {/* Welcome Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <motion.h1 
                className="text-6xl mb-4 bg-gradient-to-r from-[#60A5FA] via-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                  filter: "drop-shadow(0 0 40px rgba(59,130,246,0.6))"
                }}
              >
                {isNewUser ? `Welcome, ${userName}!` : `Welcome Back!`}
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center justify-center gap-2 text-xl text-blue-400"
              >
                <Sparkles className="w-5 h-5" />
                <span>{isNewUser ? "Let's begin your learning journey" : "Preparing your dashboard"}</span>
                <Sparkles className="w-5 h-5" />
              </motion.div>
            </motion.div>

            {/* Loading Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-12 flex justify-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full bg-blue-500"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{
                    boxShadow: "0 0 20px rgba(59, 130, 246, 0.8)"
                  }}
                />
              ))}
            </motion.div>

            {/* Auto-complete after animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              onAnimationComplete={() => {
                setTimeout(onComplete, 500);
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

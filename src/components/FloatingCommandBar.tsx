import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sparkles, MessageSquare, Brain, FileText, X, Command } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface FloatingCommandBarProps {
  onNavigate?: (view: string) => void;
}

export function FloatingCommandBar({ onNavigate }: FloatingCommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const quickActions = [
    { icon: MessageSquare, label: "Ask AI Tutor", action: "chat", color: "text-blue-400" },
    { icon: Brain, label: "Start Quiz", action: "quiz", color: "text-purple-400" },
    { icon: FileText, label: "Take Notes", action: "notes", color: "text-green-400" },
  ];

  const handleAction = (action: string) => {
    toast.success(`Opening ${action}...`);
    onNavigate?.(action);
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      toast.info(`Searching for: ${query}`);
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-8 right-8 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => setIsOpen(!isOpen)}
            className="w-16 h-16 rounded-full gradient-blue shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_50px_rgba(59,130,246,0.8)] transition-all duration-300"
          >
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Command className="w-6 h-6" />}
            </motion.div>
          </Button>
        </motion.div>

        {/* Pulsing Ring Effect */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      </motion.div>

      {/* Command Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            />

            {/* Command Bar */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed bottom-32 right-8 w-96 glass-card rounded-2xl p-6 z-40 shadow-[0_0_50px_rgba(59,130,246,0.3)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full gradient-blue flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg">Quick Command</h3>
                  <p className="text-sm text-muted-foreground">Ask AI anything...</p>
                </div>
              </div>

              {/* Search Input */}
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What do you want to learn today?"
                className="mb-4 bg-input-background border-blue-600/30 focus:border-blue-500/50 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300"
                autoFocus
              />

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.action}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => handleAction(action.action)}
                      className="w-full justify-start hover:bg-blue-600/10 hover:scale-102 transition-all duration-200"
                    >
                      <action.icon className={`w-4 h-4 mr-3 ${action.color}`} />
                      {action.label}
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* Keyboard Shortcut Hint */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-muted-foreground text-center">
                  Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Enter</kbd> to search
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

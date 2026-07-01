import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import {
  Send, Sparkles, Camera, Volume2, ThumbsUp, ThumbsDown, Copy,
  Mic, MicOff, History, X, ChevronRight, Clock, MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { tutorAPI } from "../utils/api";
import {
  getUserStats,
  recordChatMessage,
  onStatsUpdated,
  type ChatSession,
} from "../utils/userStatsStore";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "Explain quantum mechanics",
  "Help me with calculus derivatives",
  "What is machine learning?",
  "Explain photosynthesis",
];

interface EnhancedChatInterfaceProps {
  userId?: string;
}

export function EnhancedChatInterface({ userId = "" }: EnhancedChatInterfaceProps) {
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI tutor powered by GPT-4. Ask me anything about any subject, and I'll help you learn! 📚",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const loadHistory = useCallback(() => {
    if (!userId) return;
    const stats = getUserStats(userId);
    setChatHistory(stats.chatSessions.slice(0, 15));
  }, [userId]);

  useEffect(() => {
    loadHistory();
    const unsub = onStatsUpdated(loadHistory);
    return unsub;
  }, [loadHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Initialize Web Speech API
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        toast.success(`Voice captured: "${transcript}"`);
      };

      recognitionRef.current.onerror = () => {
        toast.error("Voice recognition error");
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userContent = input.trim();
    const userMessage: Message = { role: "user", content: userContent };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput("");
    setIsTyping(true);

    // Persist user message immediately
    if (userId) {
      recordChatMessage(userId, "user", userContent, sessionId);
    }

    try {
      const conversationHistory = currentMessages
        .filter(msg => msg.role !== "system")
        .map(msg => ({ role: msg.role, content: msg.content }));

      const response = await tutorAPI.chat(userContent, conversationHistory);
      const responseText = response.response;

      // Typing animation
      let currentText = "";
      const typingSpeed = 20;

      for (let i = 0; i <= responseText.length; i++) {
        setTimeout(() => {
          currentText = responseText.slice(0, i);
          setTypingText(currentText);

          if (i === responseText.length) {
            const aiResponse: Message = { role: "assistant", content: responseText };
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
            setTypingText("");

            // Persist assistant message
            if (userId) {
              recordChatMessage(userId, "assistant", responseText, sessionId);
            }

            if (voiceEnabled && "speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance(responseText);
              utterance.rate = 1.1;
              utterance.pitch = 1;
              window.speechSynthesis.speak(utterance);
              toast.info("🔊 Playing voice response...");
            }
          }
        }, i * typingSpeed);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to get AI response. Please try again.");
      setIsTyping(false);
      setTypingText("");
    }
  };

  const loadHistorySession = (session: ChatSession) => {
    const msgs: Message[] = session.messages.map(m => ({ role: m.role, content: m.content }));
    if (msgs.length === 0) return;
    setMessages([
      { role: "assistant", content: "Hello! I'm your AI tutor. Ask me anything! 📚" },
      ...msgs,
    ]);
    setShowHistory(false);
    toast.success("Chat session loaded from history!");
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Voice recognition not supported in this browser");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info("🎤 Listening...");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-full flex gap-4">
      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, x: -20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 280 }}
            exit={{ opacity: 0, x: -20, width: 0 }}
            className="flex-shrink-0 glass-card rounded-xl overflow-hidden flex flex-col"
            style={{ minWidth: 260 }}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <History className="w-4 h-4 text-blue-400" />
                Chat History
              </h3>
              <Button size="icon" variant="ghost" className="w-6 h-6 hover:bg-white/10" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-3">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No previous chats yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((session) => (
                    <motion.button
                      key={session.id}
                      onClick={() => loadHistorySession(session)}
                      className="w-full text-left p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 hover:bg-blue-950/40 hover:border-blue-700/50 transition-all group"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-2 flex-1">
                          {session.title || "Untitled Session"}
                        </p>
                        <ChevronRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{formatTimestamp(session.startedAt)}</span>
                        <Badge variant="outline" className="text-xs h-4 px-1 border-blue-900/50">
                          {session.messageCount} msg
                        </Badge>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="glass-card p-4 mb-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-blue flex items-center justify-center pulse-glow neon-border">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg">Obsidian AI Tutor</h3>
                <p className="text-sm text-muted-foreground">Personalized Learning Companion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userId && (
                <Button
                  size="sm"
                  variant={showHistory ? "default" : "outline"}
                  onClick={() => setShowHistory(!showHistory)}
                  className={showHistory ? "bg-blue-600 h-9" : "h-9"}
                >
                  <History className="w-3 h-3 mr-1" />
                  History
                  {chatHistory.length > 0 && (
                    <Badge className="ml-1 bg-blue-500/20 text-blue-200 text-xs h-4 px-1">
                      {chatHistory.length}
                    </Badge>
                  )}
                </Button>
              )}
              <Badge variant="outline" className="bg-green-600/10 text-green-400 border-green-600/30">
                ● Online
              </Badge>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={imageUploadMode ? "default" : "outline"}
              onClick={() => {
                setImageUploadMode(!imageUploadMode);
                toast.info(imageUploadMode ? "Image mode disabled" : "Image mode enabled - Upload handwritten problems!");
              }}
              className={imageUploadMode ? "bg-blue-600 h-9" : "h-9"}
            >
              <Camera className="w-3 h-3 mr-1" />
              Image
            </Button>
            <Button
              size="sm"
              variant={voiceEnabled ? "default" : "outline"}
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                toast.info(voiceEnabled ? "Voice output disabled" : "Voice output enabled");
              }}
              className={voiceEnabled ? "bg-blue-600 h-9" : "h-9"}
            >
              <Volume2 className="w-3 h-3 mr-1" />
              Voice Out
            </Button>
            <Button
              size="sm"
              variant={isListening ? "default" : "outline"}
              onClick={toggleVoiceInput}
              className={isListening ? "bg-red-600 h-9 animate-pulse" : "h-9"}
            >
              {isListening ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
              {isListening ? "Stop" : "Voice In"}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-2 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-8 h-8 gradient-blue flex-shrink-0 neon-border">
                    <Sparkles className="w-4 h-4 text-white" />
                  </Avatar>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === "user" ? "bg-blue-600 text-white" : "glass-card"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.role === "assistant" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 hover:bg-white/10"
                        onClick={() => {
                          navigator.clipboard?.writeText(message.content).catch(() => {});
                          toast.success("Copied to clipboard!");
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-white/10">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-white/10">
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <Avatar className="w-8 h-8 gradient-blue neon-border">
                  <Sparkles className="w-4 h-4 text-white" />
                </Avatar>
                <div className="glass-card rounded-2xl p-4 min-w-[100px]">
                  {typingText ? (
                    <div className="flex items-center gap-2">
                      <p className="whitespace-pre-wrap">{typingText}</p>
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-0.5 h-4 bg-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-blue-500 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(question)}
                  className="text-xs hover:bg-white/10 border-blue-900/30"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Image Upload Zone */}
        <AnimatePresence>
          {imageUploadMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 glass-card rounded-xl border-2 border-dashed border-blue-600/30"
            >
              <div className="text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-sm text-muted-foreground mb-2">Upload a photo of your handwritten problem</p>
                <Button size="sm" variant="outline" className="hover:bg-white/10">Choose Image</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything... (Press Enter to send)"
              className="min-h-[60px] resize-none bg-input-background border-white/10 focus:border-blue-600/50"
            />
            <div className="flex gap-2">
              {isListening && (
                <Button
                  variant="outline"
                  onClick={toggleVoiceInput}
                  className="h-[60px] px-4 bg-red-600/20 border-red-500/50 hover:bg-red-600/30 animate-pulse"
                >
                  <MicOff className="w-5 h-5 text-red-400" />
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 h-[60px] px-6 disabled:opacity-50 disabled:scale-100"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

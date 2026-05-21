import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Send, Sparkles, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion } from "motion/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm Obsidian — your personal AI mentor. Let's conquer today's topic. What would you like to learn about?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateMockResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateMockResponse = (query: string) => {
    const responses = [
      "Great question! Let me break this down step by step for you...",
      "I'd be happy to explain that! Here's what you need to know:",
      "That's an interesting topic! Let's explore it together:",
      "Perfect! This is a fundamental concept. Here's how it works:",
    ];
    return responses[Math.floor(Math.random() * responses.length)] + "\n\n" +
           "This is a mock response. In the full version, I'll provide detailed, personalized explanations using GPT-4 based on your learning style and level.";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="glass-card p-4 mb-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg">Obsidian AI</h3>
              <p className="text-sm text-muted-foreground">Your AI Learning Companion</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-purple-600/10 text-purple-400 border-purple-600/30">
            Active
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-2 mb-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <Avatar className="w-8 h-8 bg-gradient-to-br from-purple-600 to-violet-800">
                  <Sparkles className="w-4 h-4 text-white" />
                </Avatar>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : "glass-card"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {message.role === "assistant" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                    <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-white/10">
                      <Copy className="w-3 h-3" />
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
              
              {message.role === "user" && (
                <Avatar className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800">
                  <span className="text-sm">U</span>
                </Avatar>
              )}
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 bg-gradient-to-br from-purple-600 to-violet-800">
                <Sparkles className="w-4 h-4 text-white" />
              </Avatar>
              <div className="glass-card rounded-2xl p-4">
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-purple-500 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-purple-500 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-purple-500 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything... (Press Enter to send)"
            className="min-h-[60px] resize-none bg-input-background border-white/10 focus:border-purple-600/50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-purple-600 hover:bg-purple-700 h-[60px] px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

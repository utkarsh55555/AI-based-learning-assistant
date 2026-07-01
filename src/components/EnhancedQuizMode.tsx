
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { Input } from "./ui/input";
import { CheckCircle2, XCircle, Clock, Award, Sparkles, Zap, Target, Brain, Camera, AlertTriangle, Video } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { quizAPI } from "../utils/api";
import { recordQuizResult } from "../utils/userStatsStore";

interface Question {
  id: number;
  question: string;
  type: "mcq" | "true-false" | "coding";
  options?: string[];
  correct: number | string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  subject: string;
}

const mockQuestions: Question[] = [
  {
    id: 1,
    question: "What is the derivative of x²?",
    type: "mcq",
    options: ["x", "2x", "x²", "2x²"],
    correct: 1,
    explanation: "Using the power rule (d/dx[xⁿ] = nxⁿ⁻¹), the derivative of x² is 2x¹ = 2x.",
    difficulty: "medium",
    subject: "Mathematics"
  },
  {
    id: 2,
    question: "The Earth revolves around the Sun.",
    type: "true-false",
    options: ["True", "False"],
    correct: 0,
    explanation: "The Earth orbits (revolves) around the Sun once per year, while also rotating on its axis.",
    difficulty: "easy",
    subject: "Science"
  },
  {
    id: 3,
    question: "Write a Python function to reverse a string.",
    type: "coding",
    correct: "def reverse_string(s):\\n    return s[::-1]",
    explanation: "The most Pythonic way is using slice notation [::-1] which reverses the string.",
    difficulty: "medium",
    subject: "Computer Science"
  },
  {
    id: 4,
    question: "Which data structure uses LIFO principle?",
    type: "mcq",
    options: ["Queue", "Stack", "Array", "Tree"],
    correct: 1,
    explanation: "Stack follows Last-In-First-Out (LIFO) principle.",
    difficulty: "medium",
    subject: "Computer Science"
  },
];

export function EnhancedQuizMode({ userId = "" }: { userId?: string }) {
  const [quizMode, setQuizMode] = useState<"practice" | "timed" | "rapid">("practice");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "adaptive">("adaptive");
  const [subject, setSubject] = useState<string>("all");
  const [quizTopic, setQuizTopic] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null);
  const [codingAnswer, setCodingAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes for timed mode
  const [isStarted, setIsStarted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startTime, setStartTime] = useState<number>(0);
  
  // Camera states
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const question = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  // Request camera access
  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user"
        } 
      });
      setCameraStream(stream);
      setCameraPermission("granted");
      setCameraError(null);
      
      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      toast.success("Camera access granted!");
      return true;
    } catch (error: any) {
      console.error("Camera access error:", error);
      setCameraPermission("denied");
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access to start the quiz.");
      } else if (error.name === "NotFoundError") {
        setCameraError("No camera found on your device.");
      } else {
        setCameraError("Unable to access camera. Please check your browser settings.");
      }
      
      toast.error("Camera access required to start quiz");
      return false;
    }
  };

  // Stop camera when quiz ends or component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Attach camera stream to video element when it renders
  useEffect(() => {
    if (isStarted && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isStarted, cameraStream]);

  // Handle auto-generation from external redirects (e.g., Mind Maps)
  useEffect(() => {
    const pendingTopic = sessionStorage.getItem('pendingQuizTopic');
    if (pendingTopic) {
      setQuizTopic(pendingTopic);
      sessionStorage.removeItem('pendingQuizTopic');
      // Give state a moment to settle, then generate
      setTimeout(() => generateQuiz(pendingTopic), 100);
    }
  }, []);

  // Stop camera when quiz completes
  useEffect(() => {
    if (quizComplete && cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      toast.info("Camera monitoring ended");
    }
  }, [quizComplete]);

  useEffect(() => {
    if (quizMode === "timed" && isStarted && !quizComplete && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setQuizComplete(true);
            toast.error("Time's up!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quizMode, isStarted, quizComplete, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const generateQuiz = async (overrideTopic?: string | any) => {
    const topicToUse = typeof overrideTopic === 'string' ? overrideTopic : quizTopic;
    if (!topicToUse.trim()) {
      toast.error("Please enter a topic for the quiz");
      return;
    }

    setIsGenerating(true);
    toast.info("🤖 Generating quiz questions...");

    try {
      const actualDifficulty = difficulty === "adaptive" ? "medium" : difficulty;
      const numQuestions = 5;
      
      const quiz = await quizAPI.generate(topicToUse, actualDifficulty, numQuestions);
      
      // Parse questions from the quiz
      const parsedQuestions: Question[] = quiz.questions.map((q: any, index: number) => ({
        id: index + 1,
        question: typeof q.question === 'string' ? q.question : String(q.question || ''),
        type: "mcq" as const,
        options: Array.isArray(q.options) ? q.options.map((o: any) => typeof o === 'string' ? o : String(o ?? '')) : [],
        correct: typeof q.correct === 'number' ? q.correct : parseInt(String(q.correct ?? 0), 10),
        explanation: typeof q.explanation === 'string' ? q.explanation : String(q.explanation || ''),
        difficulty: typeof q.difficulty === 'string' ? q.difficulty : (actualDifficulty),
        subject: quizTopic
      }));

      setQuestions(parsedQuestions);
      setQuizId(quiz.id);
      setIsGenerating(false);
      toast.success("Quiz generated successfully!");
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      toast.error(error.message || "Failed to generate quiz. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleStart = async () => {
    if (!quizTopic.trim()) {
      toast.error("Please enter a topic for the quiz");
      return;
    }

    // Require camera for ALL modes before starting
    const cameraGranted = await requestCameraAccess();
    if (cameraGranted) {
      setIsStarted(true);
      setStartTime(Date.now());
      if (quizMode === "practice") {
        toast.success("Quiz started!");
      }
    } else {
      // If camera access is denied, we do not start the quiz
      toast.error("Camera access is mandatory to start the quiz.");
    }
  };

  const handleSubmit = () => {
    if (!question) return;
    
    if ((question.type === "coding" && !codingAnswer.trim()) || 
        (question.type !== "coding" && selectedAnswer === null)) {
      toast.error("Please provide an answer");
      return;
    }

    setShowResult(true);
    const isCorrect = selectedAnswer === question.correct;

    // Store answer
    setAnswers({ ...answers, [currentQuestion]: selectedAnswer });

    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);
      
      const messages = [
        "🎯 Perfect!",
        "💪 Great job!",
        "⭐ Excellent!",
        "🚀 You're on fire!",
        "🏆 Amazing!"
      ];
      toast.success(messages[Math.floor(Math.random() * messages.length)]);
    } else {
      setStreak(0);
      if (streak >= 3) {
        toast.info("Don't worry! Learn from mistakes and keep going! 💪");
      }
    }
    
    setAnsweredQuestions([...answeredQuestions, currentQuestion]);
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setCodingAnswer("");
      setShowResult(false);
      
      if (quizMode === "rapid") {
        setTimeLeft(30); // Reset timer for rapid fire
      }
    } else {
      // Submit quiz
      await submitQuiz();
    }
  };

  const submitQuiz = async () => {
    if (!quizId) return;

    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const result = await quizAPI.submit(quizId, answers, timeTaken);
      
      setXpEarned(result.xp?.xp_earned || 0);
      setQuizComplete(true);

      // Record real quiz result in stats store
      if (userId) {
        recordQuizResult(
          userId,
          quizTopic,
          result.score,
          result.total,
          result.xp?.xp_earned
        );
      }
      
      toast.success(`Quiz completed! Score: ${result.score}/${result.total} (${result.percentage.toFixed(1)}%)`, {
        description: `You earned ${result.xp?.xp_earned || 0} XP!`
      });
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
      setQuizComplete(true); // Still mark as complete
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setCodingAnswer("");
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions([]);
    setQuizComplete(false);
    setQuestions([]);
    setQuizId(null);
    setAnswers({});
    setIsStarted(false);
    setIsStarted(false);
    setStreak(0);
    setXpEarned(0);
    setTimeLeft(quizMode === "timed" ? 300 : quizMode === "rapid" ? 30 : 0);
    setCameraPermission("pending");
    setCameraError(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const generateNewQuiz = () => {
    toast.success("🎲 Generating new practice set...");
    setTimeout(() => {
      handleRestart();
      toast.success("New quiz ready!");
    }, 1500);
  };

  // Start Screen
  if (!isStarted) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <Card className="glass-card p-8">
            <div className="text-center mb-8">
              <Brain className="w-16 h-16 mx-auto mb-4 text-blue-400 float-animation" />
              <h2 className="text-3xl mb-2">Practice Quiz</h2>
              <p className="text-muted-foreground mb-6">
                Test your knowledge with AI-generated questions
              </p>
            </div>

            {/* Camera Permission Alert - Show for all modes */}
            <Alert className="mb-6 bg-blue-600/10 border-blue-600/30">
              <Camera className="w-4 h-4" />
              <AlertDescription className="ml-2">
                <span className="text-blue-400">Camera monitoring required:</span> This quiz mode requires camera access for proctoring purposes. Your camera will be active during the entire quiz.
              </AlertDescription>
            </Alert>

            {/* Camera Error Alert - Show for all modes */}
            {cameraError && cameraPermission === "denied" && (
              <Alert className="mb-6 bg-red-600/10 border-red-600/30">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <AlertDescription className="ml-2 text-red-400">
                  {cameraError}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Quiz Mode */}
              <div>
                <Label className="mb-3 block">Quiz Mode</Label>
                <Tabs value={quizMode} onValueChange={(v) => setQuizMode(v as typeof quizMode)}>
                  <TabsList className="grid w-full grid-cols-3 bg-input-background">
                    <TabsTrigger value="practice">
                      <Target className="w-4 h-4 mr-2" />
                      Practice
                    </TabsTrigger>
                    <TabsTrigger value="timed">
                      <Clock className="w-4 h-4 mr-2" />
                      Timed
                    </TabsTrigger>
                    <TabsTrigger value="rapid">
                      <Zap className="w-4 h-4 mr-2" />
                      Rapid Fire
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-xs text-muted-foreground mt-2">
                  {quizMode === "practice" && "Take your time and learn at your own pace"}
                  {quizMode === "timed" && "Complete all questions within 5 minutes"}
                  {quizMode === "rapid" && "Answer each question in 30 seconds!"}
                </p>
              </div>

              {/* Difficulty */}
              <div>
                <Label className="mb-3 block">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                  <SelectTrigger className="bg-input-background border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adaptive">🎯 Adaptive (Recommended)</SelectItem>
                    <SelectItem value="easy">😊 Easy</SelectItem>
                    <SelectItem value="medium">🤔 Medium</SelectItem>
                    <SelectItem value="hard">💪 Hard</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Adaptive difficulty adjusts based on your performance
                </p>
              </div>

              {/* Subject */}
              <div>
                <Label className="mb-3 block">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="bg-input-background border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="math">📐 Mathematics</SelectItem>
                    <SelectItem value="science">🔬 Science</SelectItem>
                    <SelectItem value="cs">💻 Computer Science</SelectItem>
                    <SelectItem value="history">📜 History</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quiz Topic */}
              <div>
                <Label className="mb-3 block">Quiz Topic</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Calculus, Photosynthesis, Python Basics..."
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    className="bg-input-background border-white/10"
                    disabled={isGenerating || questions.length > 0}
                  />
                  {questions.length === 0 && (
                    <Button
                      onClick={generateQuiz}
                      disabled={!quizTopic.trim() || isGenerating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Quiz
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter a topic and click "Generate Quiz" to create AI-powered questions
                </p>
              </div>

              {questions.length > 0 && (
                <Alert className="bg-green-600/10 border-green-600/30">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <AlertDescription className="ml-2 text-green-400">
                    Quiz ready! {questions.length} questions generated. Click "Start Quiz" to begin.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleStart}
                disabled={questions.length === 0}
                className="w-full gradient-blue hover:opacity-90 py-6 neon-border pulse-glow disabled:opacity-50"
              >
                <Camera className="w-5 h-5 mr-2" />
                {questions.length > 0 ? "Start Quiz with Camera" : "Generate Quiz First"}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Results Screen
  if (quizComplete) {
    const percentage = questions.length > 0 ? (score / questions.length) * 100 : 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-full"
      >
        <Card className="glass-card border-white/10 p-8 max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <Award className="w-20 h-20 mx-auto mb-4 text-yellow-500" />
          </motion.div>
          
          <h2 className="text-3xl mb-2">Quiz Complete! 🎉</h2>
          <p className="text-muted-foreground mb-6">
            {percentage >= 70 
              ? "Outstanding performance!" 
              : percentage >= 50 
              ? "Good effort! Keep practicing!" 
              : "Don't give up! Learning takes time."}
          </p>
          
          <div className="glass-card p-6 rounded-xl mb-6 border border-blue-600/30">
            <p className="text-5xl mb-2">{percentage.toFixed(0)}%</p>
            <p className="text-muted-foreground">
              {score} out of {questions.length} correct
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground mb-1">XP Earned</p>
              <p className="text-2xl text-blue-400">+{xpEarned}</p>
            </Card>
            <Card className="glass-card p-4">
              <p className="text-sm text-muted-foreground mb-1">Best Streak</p>
              <p className="text-2xl text-orange-400">{Math.max(...answeredQuestions.map((_, i) => i))}</p>
            </Card>
          </div>

          <Progress value={percentage} className="h-2 mb-6" />

          <div className="flex gap-3">
            <Button onClick={handleRestart} variant="outline" className="flex-1 border-white/10">
              Try Again
            </Button>
            <Button onClick={generateNewQuiz} className="flex-1 gradient-blue hover:opacity-90 neon-border">
              <Sparkles className="w-4 h-4 mr-2" />
              New Quiz
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Quiz Screen with Camera
  return (
    <div className="h-full flex gap-6">
      {/* Main Quiz Area */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-600/10 text-blue-400 border-blue-600/30">
                Question {currentQuestion + 1}/{questions.length}
              </Badge>
              {(quizMode === "timed" || quizMode === "rapid") && (
                <div className={`flex items-center gap-1 text-sm ${timeLeft < 30 ? 'text-red-400' : 'text-muted-foreground'}`}>
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}
              <Badge variant="outline" className={`text-xs ${
                question.difficulty === "hard" ? "bg-red-600/10 border-red-600/30" :
                question.difficulty === "medium" ? "bg-yellow-600/10 border-yellow-600/30" :
                "bg-green-600/10 border-green-600/30"
              }`}>
                {question.difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {streak > 0 && (
                <div className="flex items-center gap-1 text-orange-400">
                  <span>🔥</span>
                  <span>{streak} streak</span>
                </div>
              )}
              <div>
                Score: <span className="text-blue-400">{score}</span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card border-white/10 p-8">
              {question && (
                <>
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-2xl flex-1">{question.question}</h3>
                <Badge variant="outline" className="text-xs">
                  {question.subject}
                </Badge>
              </div>

              {question.type === "coding" ? (
                <div className="space-y-4">
                  <Label>Your Code:</Label>
                  <Textarea
                    value={codingAnswer}
                    onChange={(e) => setCodingAnswer(e.target.value)}
                    placeholder="Write your code here..."
                    className="min-h-[200px] font-mono bg-input-background border-white/10"
                    disabled={showResult}
                  />
                </div>
              ) : (
                <RadioGroup
                  value={selectedAnswer?.toString()}
                  onValueChange={(value) => setSelectedAnswer(parseInt(value))}
                  disabled={showResult}
                >
                  <div className="space-y-3">
                    {question.options?.map((option, index) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrect = index === question.correct;
                      const showCorrect = showResult && isCorrect;
                      const showIncorrect = showResult && isSelected && !isCorrect;

                      return (
                        <motion.div
                          key={index}
                          whileHover={{ scale: showResult ? 1 : 1.02 }}
                          whileTap={{ scale: showResult ? 1 : 0.98 }}
                        >
                          <Label
                            htmlFor={`option-${index}`}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              showCorrect
                                ? "bg-green-600/20 border-green-600/50"
                                : showIncorrect
                                ? "bg-red-600/20 border-red-600/50"
                                : isSelected
                                ? "bg-blue-600/20 border-blue-600/50"
                                : "border-white/10 hover:border-blue-600/30 hover:bg-white/5"
                            }`}
                          >
                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                            <span className="flex-1">{option}</span>
                            {showCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {showIncorrect && <XCircle className="w-5 h-5 text-red-500" />}
                          </Label>
                        </motion.div>
                      );
                    })}
                  </div>
                </RadioGroup>
              )}

              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-lg bg-blue-600/10 border border-blue-600/30"
                >
                  <p className="text-sm">
                    <span className="text-blue-400">💡 Explanation:</span> {question.explanation}
                  </p>
                </motion.div>
              )}

              <div className="flex gap-3 mt-8">
                {!showResult ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      (question.type === "coding" && !codingAnswer.trim()) ||
                      (question.type !== "coding" && selectedAnswer === null)
                    }
                    className="w-full gradient-blue hover:opacity-90 neon-border"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="w-full gradient-blue hover:opacity-90 neon-border">
                    {currentQuestion < questions.length - 1 ? "Next Question →" : "Submit Quiz"}
                  </Button>
                )}
              </div>
                </>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Camera Monitor */}
      <div className="w-80">
        <Card className="glass-card p-4 sticky top-0">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg">Camera Monitor</h3>
            <Badge variant="outline" className="ml-auto bg-green-600/10 border-green-600/30 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Active
            </Badge>
          </div>
          
          <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] border-2 border-blue-600/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror-video"
            />
            {!cameraStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-blue-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Initializing camera...</p>
                </div>
              </div>
            )}
          </div>
          
          <Alert className="mt-4 bg-blue-600/10 border-blue-600/30">
            <AlertTriangle className="w-4 h-4 text-blue-400" />
            <AlertDescription className="ml-2 text-xs">
              Your quiz session is being monitored. Please stay in frame and avoid leaving the screen.
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    </div>
  );
}

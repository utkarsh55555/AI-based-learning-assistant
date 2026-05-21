import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { CheckCircle2, XCircle, Clock, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const mockQuestions: Question[] = [
  {
    id: 1,
    question: "What is the derivative of x²?",
    options: ["x", "2x", "x²", "2x²"],
    correct: 1,
    explanation: "Using the power rule (d/dx[xⁿ] = nxⁿ⁻¹), the derivative of x² is 2x¹ = 2x.",
  },
  {
    id: 2,
    question: "Which data structure uses LIFO principle?",
    options: ["Queue", "Stack", "Array", "Tree"],
    correct: 1,
    explanation: "Stack follows Last-In-First-Out (LIFO) principle, where the last element added is the first one to be removed.",
  },
  {
    id: 3,
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correct: 1,
    explanation: "Binary search divides the search space in half each time, resulting in logarithmic time complexity O(log n).",
  },
];

export function QuizMode() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);

  const question = mockQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / mockQuestions.length) * 100;

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    setShowResult(true);
    if (selectedAnswer === question.correct) {
      setScore(score + 1);
    }
    setAnsweredQuestions([...answeredQuestions, currentQuestion]);
  };

  const handleNext = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions([]);
    setQuizComplete(false);
  };

  if (quizComplete) {
    const percentage = (score / mockQuestions.length) * 100;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center h-full"
      >
        <Card className="glass-card border-white/10 p-8 max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <Award className="w-20 h-20 mx-auto mb-4 text-yellow-500" />
          </motion.div>
          
          <h2 className="text-3xl mb-2">Quiz Complete! 🎉</h2>
          <p className="text-muted-foreground mb-6">Great job on finishing the quiz!</p>
          
          <div className="glass-card p-6 rounded-xl mb-6 border border-purple-600/30">
            <p className="text-5xl mb-2">{percentage.toFixed(0)}%</p>
            <p className="text-muted-foreground">
              {score} out of {mockQuestions.length} correct
            </p>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Performance</span>
              <span className={percentage >= 70 ? "text-green-500" : percentage >= 50 ? "text-yellow-500" : "text-red-500"}>
                {percentage >= 70 ? "Excellent!" : percentage >= 50 ? "Good!" : "Keep Practicing!"}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleRestart} variant="outline" className="flex-1 border-white/10">
              Try Again
            </Button>
            <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
              Next Topic
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-600/10 text-purple-400 border-purple-600/30">
              Question {currentQuestion + 1}/{mockQuestions.length}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>5:00</span>
            </div>
          </div>
          <div className="text-sm">
            Score: <span className="text-purple-400">{score}</span>
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
            <h3 className="text-2xl mb-8">{question.question}</h3>

            <RadioGroup
              value={selectedAnswer?.toString()}
              onValueChange={(value) => setSelectedAnswer(parseInt(value))}
              disabled={showResult}
            >
              <div className="space-y-3">
                {question.options.map((option, index) => {
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
                            ? "bg-purple-600/20 border-purple-600/50"
                            : "border-white/10 hover:border-purple-600/30 hover:bg-white/5"
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

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-lg bg-purple-600/10 border border-purple-600/30"
              >
                <p className="text-sm">
                  <span className="text-purple-400">Explanation:</span> {question.explanation}
                </p>
              </motion.div>
            )}

            <div className="flex gap-3 mt-8">
              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNext} className="w-full bg-purple-600 hover:bg-purple-700">
                  {currentQuestion < mockQuestions.length - 1 ? "Next Question" : "See Results"}
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

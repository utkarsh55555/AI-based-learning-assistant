import { useState } from "react";
import { useLocalStorage } from "../utils/useLocalStorage";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Sparkles, Plus, Shuffle, Check, X, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string;
  mastered: boolean;
  reviewCount: number;
}

export function FlashcardCreator() {
  const [flashcards, setFlashcards] = useLocalStorage<Flashcard[]>("flashcards", [
    {
      id: "1",
      front: "What is the derivative of x²?",
      back: "2x (using the power rule: d/dx[xⁿ] = nxⁿ⁻¹)",
      subject: "Mathematics",
      mastered: false,
      reviewCount: 3
    },
    {
      id: "2",
      front: "Explain the Pythagorean theorem",
      back: "In a right triangle, a² + b² = c², where c is the hypotenuse and a, b are the other two sides",
      subject: "Mathematics",
      mastered: true,
      reviewCount: 8
    },
    {
      id: "3",
      front: "What is quantum superposition?",
      back: "A quantum system can exist in multiple states simultaneously until measured",
      subject: "Physics",
      mastered: false,
      reviewCount: 2
    },
  ]);

  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const currentCard = flashcards[currentCardIndex];
  const masteredCount = flashcards.filter(c => c.mastered).length;
  const progress = (masteredCount / flashcards.length) * 100;

  const handleCreateCard = () => {
    if (!newCardFront.trim() || !newCardBack.trim()) {
      toast.error("Please fill in both sides of the flashcard");
      return;
    }

    const newCard: Flashcard = {
      id: Date.now().toString(),
      front: newCardFront,
      back: newCardBack,
      subject: "General",
      mastered: false,
      reviewCount: 0
    };

    setFlashcards([...flashcards, newCard]);
    setNewCardFront("");
    setNewCardBack("");
    setShowCreateForm(false);
    toast.success("Flashcard created!");
  };

  const generateFlashcards = () => {
    toast.info("🎲 Generating AI flashcards...");
    setTimeout(() => {
      const aiCard: Flashcard = {
        id: Date.now().toString(),
        front: "What is Big O notation?",
        back: "Big O notation describes the time/space complexity of algorithms, representing the worst-case scenario growth rate",
        subject: "Computer Science",
        mastered: false,
        reviewCount: 0
      };
      setFlashcards([...flashcards, aiCard]);
      toast.success("AI flashcard generated!");
    }, 1500);
  };

  const markCard = (mastered: boolean) => {
    const updatedCards = [...flashcards];
    updatedCards[currentCardIndex] = {
      ...currentCard,
      mastered,
      reviewCount: currentCard.reviewCount + 1
    };
    setFlashcards(updatedCards);
    
    toast.success(mastered ? "Marked as mastered! 🎉" : "Needs more review");
    
    // Move to next card
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      setStudyMode(false);
      setCurrentCardIndex(0);
      toast.success("Study session complete!");
    }
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    toast.success("Cards shuffled!");
  };

  const deleteCard = (id: string) => {
    setFlashcards(flashcards.filter(c => c.id !== id));
    toast.success("Flashcard deleted");
  };

  if (studyMode) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="glass-card p-4 rounded-xl mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Card {currentCardIndex + 1} of {flashcards.length}
              </span>
              <Badge variant="outline" className="bg-blue-600/20 border-blue-600/50">
                {currentCard.subject}
              </Badge>
            </div>
            <Progress value={((currentCardIndex + 1) / flashcards.length) * 100} className="h-2" />
          </div>

          {/* Flashcard */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCardIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-6"
            >
              <div 
                className="relative h-96 cursor-pointer"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front */}
                  <Card
                    className="absolute inset-0 glass-card p-8 flex items-center justify-center text-center"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden"
                    }}
                  >
                    <div>
                      <p className="text-sm text-blue-400 mb-4">Question</p>
                      <p className="text-2xl">{currentCard.front}</p>
                      <p className="text-sm text-muted-foreground mt-6">Click to reveal answer</p>
                    </div>
                  </Card>

                  {/* Back */}
                  <Card
                    className="absolute inset-0 glass-card p-8 flex items-center justify-center text-center bg-blue-600/10"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                  >
                    <div>
                      <p className="text-sm text-blue-400 mb-4">Answer</p>
                      <p className="text-xl">{currentCard.back}</p>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 hover:bg-red-600/20 border-red-600/50"
              onClick={() => markCard(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Need Review
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => markCard(true)}
            >
              <Check className="w-4 h-4 mr-2" />
              Mastered
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => {
              setStudyMode(false);
              setCurrentCardIndex(0);
              setIsFlipped(false);
            }}
          >
            Exit Study Mode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl mb-2">Flashcards</h2>
            <p className="text-muted-foreground">Create and review flashcards with spaced repetition</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Mastery Progress</p>
            <p className="text-3xl text-blue-400">{Math.round(progress)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="glass-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Cards</p>
            <p className="text-2xl text-blue-400">{flashcards.length}</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Mastered</p>
            <p className="text-2xl text-green-400">{masteredCount}</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">In Progress</p>
            <p className="text-2xl text-orange-400">{flashcards.length - masteredCount}</p>
          </Card>
        </div>

        <Progress value={progress} className="h-2 mb-6" />

        <div className="flex gap-3">
          <Button
            onClick={() => setStudyMode(true)}
            className="gradient-blue hover:opacity-90 neon-border"
            disabled={flashcards.length === 0}
          >
            Start Study Session
          </Button>
          <Button
            variant="outline"
            onClick={shuffleCards}
            className="hover:bg-white/10"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Shuffle
          </Button>
          <Button
            variant="outline"
            onClick={generateFlashcards}
            className="hover:bg-white/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="hover:bg-white/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Card
          </Button>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="glass-card p-6">
              <h3 className="mb-4">Create New Flashcard</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Front (Question)</label>
                  <Input
                    value={newCardFront}
                    onChange={(e) => setNewCardFront(e.target.value)}
                    placeholder="Enter your question..."
                    className="bg-input-background border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Back (Answer)</label>
                  <Textarea
                    value={newCardBack}
                    onChange={(e) => setNewCardBack(e.target.value)}
                    placeholder="Enter the answer..."
                    className="bg-input-background border-white/10 min-h-[100px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateCard} className="gradient-blue hover:opacity-90 neon-border">
                    Create Flashcard
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flashcard List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flashcards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={`glass-card p-4 ${card.mastered ? "border-green-600/50" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <Badge variant="outline" className="text-xs">
                  {card.subject}
                </Badge>
                <div className="flex gap-1">
                  {card.mastered && <Check className="w-4 h-4 text-green-400" />}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-white/10"
                    onClick={() => deleteCard(card.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm mb-2">{card.front}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{card.back}</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-muted-foreground">
                  Reviewed {card.reviewCount} times
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

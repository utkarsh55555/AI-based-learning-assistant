import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Calendar, BookOpen, Plus, Sparkles, ArrowLeft, CheckCircle2, ChevronRight, BarChart3, Clock } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { studyAPI } from "../utils/api";
import { Progress } from "./ui/progress";

interface PlanTask {
  id: string;
  title: string;
  completed: boolean;
}

interface PlanWeek {
  week: number;
  title: string;
  tasks: PlanTask[];
}

interface StudyPlan {
  id: string;
  subject: string;
  duration_weeks: number;
  current_level: string;
  progress: number;
  weeks: PlanWeek[];
}

export function StudyPlanner() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [newSubject, setNewSubject] = useState("");
  const [newDuration, setNewDuration] = useState("4");
  const [newLevel, setNewLevel] = useState("intermediate");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const data = await studyAPI.getPlans();
      setPlans(data as StudyPlan[]);
    } catch (error) {
      console.error("Failed to load plans:", error);
      toast.error("Failed to load study plans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newSubject.trim()) {
      toast.error("Please enter a subject to study");
      return;
    }
    try {
      setIsLoading(true);
      toast.info("🤖 AI is generating your personalized plan...");
      const durationWeeks = parseInt(newDuration) || 4;
      const newPlan = await studyAPI.createPlan(newSubject, durationWeeks, newLevel);
      setPlans([newPlan as StudyPlan, ...plans]);
      setIsCreating(false);
      setNewSubject("");
      setSelectedPlan(newPlan as StudyPlan);
      toast.success("Study plan generated successfully!");
    } catch (error) {
      console.error("Failed to create plan:", error);
      toast.error("Failed to generate plan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProgress = async (plan: StudyPlan, weekIndex: number, taskIndex: number) => {
    const updatedWeeks = [...plan.weeks];
    updatedWeeks[weekIndex].tasks[taskIndex].completed = !updatedWeeks[weekIndex].tasks[taskIndex].completed;
    
    // Calculate new total progress percentage
    let totalTasks = 0;
    let completedTasks = 0;
    updatedWeeks.forEach(w => {
      w.tasks.forEach(t => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });
    });
    
    const newProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    
    // Optimistic update
    const updatedPlan = { ...plan, weeks: updatedWeeks, progress: newProgress };
    setSelectedPlan(updatedPlan);
    setPlans(plans.map(p => p.id === plan.id ? updatedPlan : p));

    try {
      await studyAPI.updateProgress(plan.id, newProgress);
    } catch (error) {
      console.error("Failed to sync progress:", error);
      toast.error("Failed to sync progress with backend");
    }
  };

  if (isLoading && plans.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl mb-2">AI Study Planner</h2>
            <p className="text-muted-foreground">Generate comprehensive learning paths tailored to your level</p>
          </div>
          {!isCreating && !selectedPlan && (
            <Button 
              className="gradient-blue hover:opacity-90 neon-border"
              onClick={() => setIsCreating(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Plan
            </Button>
          )}
          {(isCreating || selectedPlan) && (
            <Button 
              variant="outline"
              className="hover:bg-white/10"
              onClick={() => {
                setIsCreating(false);
                setSelectedPlan(null);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
          )}
        </div>
      </motion.div>

      <div className="flex-1 overflow-auto pb-6">
        {isCreating ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="glass-card p-8 rounded-xl border-blue-600/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <h3 className="text-2xl mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-400" />
                Generate New AI Plan
              </h3>
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block text-lg">What do you want to learn?</Label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g., Quantum Computing, React JS, Japanese"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleCreatePlan()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-3 block">Duration (Weeks)</Label>
                    <select
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none"
                    >
                      <option value="1">1 Week (Crash Course)</option>
                      <option value="2">2 Weeks (Short)</option>
                      <option value="4">4 Weeks (Standard)</option>
                      <option value="8">8 Weeks (In-depth)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-3 block">Current Level</Label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value)}
                      className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg focus:border-blue-500 outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={handleCreatePlan}
                  disabled={isLoading || !newSubject.trim()}
                  className="w-full gradient-blue hover:opacity-90 py-6 text-lg neon-border mt-4"
                >
                  {isLoading ? (
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  {isLoading ? "Generating Magic..." : "Generate AI Plan"}
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : selectedPlan ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Plan Overview Card */}
            <Card className="glass-card p-6 border-blue-600/30 bg-gradient-to-br from-blue-900/10 to-transparent">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-3xl mb-2">{selectedPlan.subject}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="outline" className="border-blue-600/30 text-blue-400 capitalize">
                      {selectedPlan.current_level}
                    </Badge>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {selectedPlan.duration_weeks} Weeks</span>
                  </div>
                </div>
                <div className="md:text-right">
                  <div className="text-3xl font-bold text-blue-400 mb-1">{selectedPlan.progress}%</div>
                  <div className="text-sm text-muted-foreground">Overall Progress</div>
                </div>
              </div>
              <Progress value={selectedPlan.progress} className="h-3 bg-blue-950/50" />
            </Card>

            {/* Weeks Timeline */}
            <div className="space-y-4">
              {selectedPlan.weeks.map((week, wIndex) => {
                const weekProgress = Math.round(
                  (week.tasks.filter(t => t.completed).length / (week.tasks.length || 1)) * 100
                );
                
                return (
                  <Card key={wIndex} className="glass-card overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                      <h4 className="text-lg font-medium flex items-center gap-2">
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Week {week.week}</Badge>
                        {week.title}
                      </h4>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{weekProgress}%</span>
                        <Progress value={weekProgress} className="w-24 h-2" />
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {week.tasks.map((task, tIndex) => (
                        <div 
                          key={task.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all border ${
                            task.completed 
                              ? 'bg-green-900/20 border-green-900/30 opacity-70' 
                              : 'bg-white/5 border-white/10 hover:border-blue-500/30'
                          }`}
                        >
                          <Checkbox
                            checked={task.completed}
                            className={`mt-1 ${task.completed ? 'data-[state=checked]:bg-green-500' : ''}`}
                            onCheckedChange={() => handleUpdateProgress(selectedPlan, wIndex, tIndex)}
                          />
                          <div className="flex-1">
                            <p className={`text-base ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </p>
                          </div>
                          {task.completed && (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl mb-2">No study plans yet</h3>
                <p className="text-muted-foreground mb-6">Generate your first AI-powered learning path.</p>
                <Button 
                  className="gradient-blue neon-border"
                  onClick={() => setIsCreating(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate First Plan
                </Button>
              </div>
            ) : (
              plans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card 
                    className="glass-card p-6 h-full cursor-pointer hover:border-blue-500/50 transition-all group hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] flex flex-col"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 capitalize">
                          {plan.current_level}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3"/> {plan.duration_weeks}w
                        </span>
                      </div>
                      <h3 className="text-xl font-medium mb-2 group-hover:text-blue-300 transition-colors line-clamp-2">
                        {plan.subject}
                      </h3>
                    </div>
                    
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span>{plan.progress}%</span>
                      </div>
                      <Progress value={plan.progress} className="h-2" />
                      
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-blue-400 flex items-center gap-1">
                          View Plan <ChevronRight className="w-4 h-4" />
                        </span>
                        {plan.progress === 100 && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

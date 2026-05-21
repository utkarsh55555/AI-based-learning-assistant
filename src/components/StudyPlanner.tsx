import { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Calendar, Clock, BookOpen, Plus, CheckCircle2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import { studyAPI } from "../utils/api";

interface StudyTask {
  id: string;
  subject: string;
  topic: string;
  duration: string;
  time: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
}

export function StudyPlanner() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [newTaskSubject, setNewTaskSubject] = useState("");
  const [newTaskTopic, setNewTaskTopic] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("30 min");
  const [newTaskTime, setNewTaskTime] = useState("10:00 AM");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-600/20 text-red-400 border-red-600/30";
      case "medium":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      case "low":
        return "bg-blue-600/20 text-blue-400 border-blue-600/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
    }
  };

  const addTask = () => {
    if (!newTaskSubject.trim() || !newTaskTopic.trim()) {
      toast.error("Please enter subject and topic");
      return;
    }

    const newTask: StudyTask = {
      id: Date.now().toString(),
      subject: newTaskSubject,
      topic: newTaskTopic,
      duration: newTaskDuration,
      time: newTaskTime,
      completed: false,
      priority: newTaskPriority,
    };

    setTasks([newTask, ...tasks]);
    setNewTaskSubject("");
    setNewTaskTopic("");
    setNewTaskDuration("30 min");
    setNewTaskTime("10:00 AM");
    setNewTaskPriority("medium");
    setShowAddTask(false);
    toast.success("✨ Task added successfully!");
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    toast.success("Task status updated!");
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
    toast.success("Task deleted successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl mb-2">Study Planner</h2>
            <p className="text-muted-foreground">Your personalized learning schedule</p>
          </div>
          <Button className="gradient-blue hover:opacity-90 neon-border">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card border-white/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl">Today's Schedule</h3>
              <Badge variant="outline" className="ml-auto bg-blue-600/10 text-blue-400 border-blue-600/30">
                {tasks.filter(t => !t.completed).length} remaining
              </Badge>
            </div>

            {/* Add Task Form */}
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">Subject</Label>
                <input
                  type="text"
                  value={newTaskSubject}
                  onChange={(e) => setNewTaskSubject(e.target.value)}
                  placeholder="e.g., Mathematics, Physics, CS"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                />
              </div>
              <div>
                <Label className="mb-3 block">Topic</Label>
                <input
                  type="text"
                  value={newTaskTopic}
                  onChange={(e) => setNewTaskTopic(e.target.value)}
                  placeholder="e.g., Complete Calculus Practice Set"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                />
              </div>
              <div>
                <Label className="mb-3 block">Duration</Label>
                <input
                  type="text"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(e.target.value)}
                  placeholder="e.g., 30 min"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                />
              </div>
              <div>
                <Label className="mb-3 block">Time</Label>
                <input
                  type="text"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  placeholder="e.g., 10:00 AM"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                />
              </div>
              <div>
                <Label className="mb-3 block">Priority</Label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as "high" | "medium" | "low")}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <Button
                onClick={addTask}
                disabled={!newTaskSubject.trim() || !newTaskTopic.trim()}
                className="w-full gradient-blue hover:opacity-90 py-6 neon-border"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            <div className="space-y-3">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border transition-all ${
                    task.completed
                      ? "bg-green-600/10 border-green-600/30 opacity-75"
                      : "bg-white/5 border-white/10 hover:border-blue-600/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.completed}
                      className="mt-1"
                      onChange={() => toggleTaskCompletion(task.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{task.subject}</p>
                          <p className={task.completed ? "line-through opacity-50" : ""}>
                            {task.topic}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={getPriorityColor(task.priority)}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{task.duration}</span>
                        </div>
                      </div>
                    </div>
                    {task.completed && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        {/* Weekly Overview & Stats */}
        <div className="space-y-4">
          {/* Study Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card border-white/10 p-6">
              <h3 className="text-lg mb-4">Study Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tasks</span>
                  <span className="text-2xl font-bold">{tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="text-2xl font-bold text-green-400">
                    {tasks.filter(t => t.completed).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="text-2xl font-bold text-blue-400">
                    {tasks.filter(t => !t.completed).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {tasks.length > 0 
                      ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Recommendation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card border-blue-600/30 p-6 bg-gradient-to-br from-blue-900/20 to-blue-800/20">
              <h3 className="text-lg mb-2">AI Suggestion 💡</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Based on your progress, consider spending more time on Physics this week.
              </p>
              <Button variant="outline" className="w-full border-blue-600/30 hover:bg-blue-600/20">
                Adjust Schedule
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

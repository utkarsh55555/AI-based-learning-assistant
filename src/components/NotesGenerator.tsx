import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FileText, Plus, Download, Sparkles, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { notesAPI } from "../utils/api";

interface Note {
  id: number;
  title: string;
  subject: string;
  content: string;
  summary: string;
  keyPoints: string[];
  createdAt: string;
}

const mockNotes: Note[] = [
  {
    id: 1,
    title: "Quantum Mechanics Basics",
    subject: "Physics",
    content: "Wave-particle duality is a fundamental concept in quantum mechanics. It states that particles like electrons and photons exhibit both wave-like and particle-like properties...",
    summary: "Introduction to wave-particle duality and its implications in quantum mechanics.",
    keyPoints: [
      "Matter exhibits wave-particle duality",
      "Heisenberg uncertainty principle",
      "Quantum superposition",
      "Wave function collapse upon measurement"
    ],
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    title: "Calculus - Integration Techniques",
    subject: "Mathematics",
    content: "Integration by parts is a powerful technique derived from the product rule for differentiation. The formula is ∫u dv = uv - ∫v du...",
    summary: "Overview of integration by parts and substitution methods.",
    keyPoints: [
      "Integration by parts formula",
      "U-substitution method",
      "Trigonometric integration",
      "Partial fractions decomposition"
    ],
    createdAt: "2024-01-14"
  }
];

export function NotesGenerator() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newNoteTopic, setNewNoteTopic] = useState("");
  const [newNoteSubject, setNewNoteSubject] = useState("Mathematics");
  const [loading, setLoading] = useState(true);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
    
    // Check for auto-generation redirect from Mind Maps
    const pendingTopic = sessionStorage.getItem('pendingNotesTopic');
    if (pendingTopic) {
      setNewNoteTopic(pendingTopic);
      sessionStorage.removeItem('pendingNotesTopic');
      setTimeout(() => generateNotes(pendingTopic), 100);
    }
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const fetchedNotes = await notesAPI.getAll();
      const formattedNotes: Note[] = fetchedNotes.map((note: any, index: number) => {
        const content = typeof note.content === 'string' ? note.content : (note.content ? String(note.content) : '');
        return {
          id: index + 1,
          title: typeof note.title === 'string' ? note.title : String(note.title || 'Untitled'),
          subject: note.subject || "General",
          content: content,
          summary: content.length > 0 ? content.substring(0, 150) + "..." : (note.summary || ''),
          keyPoints: Array.isArray(note.tags) ? note.tags : (Array.isArray(note.keyPoints) ? note.keyPoints : []),
          createdAt: note.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        };
      });
      setNotes(formattedNotes);
      if (formattedNotes.length > 0) {
        setSelectedNote(formattedNotes[0]);
      }
    } catch (error: any) {
      console.error("Error loading notes:", error);
      // Silently handle error - don't show toast to avoid annoying users
      // toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const generateNotes = async (overrideTopic?: string | any) => {
    const topicToUse = typeof overrideTopic === 'string' ? overrideTopic : newNoteTopic;
    if (!topicToUse.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    toast.info("🤖 AI is generating your notes...");

    try {
      const result = await notesAPI.generate(topicToUse, newNoteSubject, "intermediate");
      const aiData = result.ai_data || {};
      const content = typeof aiData.content === 'string' ? aiData.content : String(aiData.content || '');
      const summary = typeof aiData.summary === 'string' ? aiData.summary : (content.substring(0, 150) || '');
      
      const newNote: Note = {
        id: notes.length + 1,
        title: typeof aiData.title === 'string' ? aiData.title : (topicToUse || 'New Note'),
        subject: newNoteSubject,
        content: content,
        summary: summary,
        keyPoints: Array.isArray(aiData.keyPoints) ? aiData.keyPoints.map((p: any) => String(p)) : [],
        createdAt: new Date().toISOString().split('T')[0]
      };

      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setNewNoteTopic("");
      toast.success("✨ Notes generated successfully!");
    } catch (error: any) {
      console.error("Error generating notes:", error);
      toast.error(error.message || "Failed to generate notes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteNote = async (id: number) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    try {
      // Find the actual note ID from the database
      const allNotes = await notesAPI.getAll();
      const dbNote = allNotes.find((n: any) => n.title === noteToDelete.title);
      
      if (dbNote) {
        await notesAPI.delete(dbNote.id);
      }
      
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      if (selectedNote?.id === id) {
        setSelectedNote(updatedNotes[0] || null);
      }
      toast.success("Note deleted successfully");
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const downloadNote = (note: Note) => {
    const textContent = `Title: ${note.title}
Subject: ${note.subject}
Date: ${note.createdAt}

=== SUMMARY ===
${note.summary}

=== KEY POINTS ===
${note.keyPoints.map(point => `- ${point}`).join('\n')}

=== DETAILED NOTES ===
${note.content}
`;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`📥 Downloaded "${note.title}" successfully!`);
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Note List & Generate */}
      <div className="lg:col-span-1 space-y-4">
        {/* Generate Section */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg">My Notes</h3>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>

          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Topic</Label>
              <Input
                placeholder="e.g., Newton's Laws"
                value={newNoteTopic}
                onChange={(e) => setNewNoteTopic(e.target.value)}
                className="bg-input-background border-white/10"
              />
            </div>
            <div>
              <Label className="mb-2 block">Subject</Label>
              <Select value={newNoteSubject} onValueChange={setNewNoteSubject}>
                <SelectTrigger className="bg-input-background border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">📐 Mathematics</SelectItem>
                  <SelectItem value="Physics">⚛️ Physics</SelectItem>
                  <SelectItem value="Chemistry">🧪 Chemistry</SelectItem>
                  <SelectItem value="Biology">🧬 Biology</SelectItem>
                  <SelectItem value="Computer Science">💻 Computer Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generateNotes}
              disabled={isGenerating}
              className="w-full gradient-blue hover:opacity-90 neon-border"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Notes
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Notes List */}
        <Card className="glass-card p-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    onClick={() => setSelectedNote(note)}
                    className={`p-4 cursor-pointer transition-all border ${
                      selectedNote?.id === note.id
                        ? "bg-blue-600/20 border-blue-600/50"
                        : "glass-card hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm line-clamp-1">{note.title}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                        className="h-6 w-6 p-0 hover:bg-red-600/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {note.subject}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{note.createdAt}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Right Panel - Note Content */}
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <motion.div
              key={selectedNote.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="glass-card p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl mb-2">{selectedNote.title}</h2>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedNote.subject}</Badge>
                      <span className="text-sm text-muted-foreground">{selectedNote.createdAt}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadNote(selectedNote)}
                    className="gradient-blue hover:opacity-90 neon-border"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {/* Summary Section */}
                    <div>
                      <h3 className="mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        Summary
                      </h3>
                      <p className="text-muted-foreground bg-blue-600/10 p-4 rounded-lg border border-blue-600/30">
                        {selectedNote.summary}
                      </p>
                    </div>

                    {/* Key Points */}
                    <div>
                      <h3 className="mb-3">Key Points</h3>
                      <div className="space-y-2">
                        {selectedNote.keyPoints.map((point, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-start gap-3 p-3 glass-card rounded-lg"
                          >
                            <div className="w-6 h-6 rounded-full gradient-blue flex items-center justify-center flex-shrink-0 text-sm neon-border">
                              {idx + 1}
                            </div>
                            <p className="flex-1">{point}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Full Content */}
                    <div>
                      <h3 className="mb-3">Detailed Notes</h3>
                      <div className="glass-card p-4 rounded-lg">
                        <p className="text-muted-foreground whitespace-pre-wrap">{selectedNote.content}</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            </motion.div>
          ) : (
            <Card className="glass-card p-12 text-center h-full flex items-center justify-center">
              <div>
                <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Select a note to view</p>
              </div>
            </Card>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

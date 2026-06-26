import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Sparkles, Plus, Trash2, Download, Share2, Maximize2, Minimize2, BookOpen, Brain, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { mindmapAPI } from "../utils/api";
import { toPng, toBlob } from "html-to-image";

interface SubTopic {
  id: string;
  label: string;
  summary: string;
}

interface Topic {
  id: string;
  label: string;
  color: string;
  summary: string;
  subtopics: SubTopic[];
  expanded: boolean;
}

interface MindMap {
  id: string;
  title: string;
  topics: Topic[];
  createdAt: Date;
}

const sampleMindMaps: MindMap[] = [
  {
    id: "1",
    title: "Machine Learning",
    topics: [
      {
        id: "supervised",
        label: "Supervised Learning",
        color: "#3B82F6",
        summary: "Supervised learning is a machine learning paradigm where the algorithm learns from labeled training data. The model is trained on input-output pairs and learns to map inputs to the correct outputs. This approach is widely used for classification and regression tasks.",
        expanded: false,
        subtopics: [
          {
            id: "regression",
            label: "Regression",
            summary: "Regression algorithms predict continuous numerical values. Common techniques include Linear Regression, Polynomial Regression, and Ridge Regression. Used in price prediction, stock market analysis, and weather forecasting."
          },
          {
            id: "classification",
            label: "Classification",
            summary: "Classification algorithms predict categorical labels. Techniques include Logistic Regression, Decision Trees, Random Forests, and Support Vector Machines. Applications include spam detection, image recognition, and medical diagnosis."
          },
          {
            id: "neural-networks",
            label: "Neural Networks",
            summary: "Artificial Neural Networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) organized in layers. Deep learning uses multiple hidden layers for complex pattern recognition."
          }
        ]
      },
      {
        id: "unsupervised",
        label: "Unsupervised Learning",
        color: "#10B981",
        summary: "Unsupervised learning works with unlabeled data to discover hidden patterns and structures. The algorithm finds relationships and groupings without explicit guidance. It's essential for exploratory data analysis and dimensionality reduction.",
        expanded: false,
        subtopics: [
          {
            id: "clustering",
            label: "Clustering",
            summary: "Clustering groups similar data points together. K-Means, Hierarchical Clustering, and DBSCAN are popular algorithms. Used in customer segmentation, anomaly detection, and document organization."
          },
          {
            id: "dimensionality",
            label: "Dimensionality Reduction",
            summary: "Reduces the number of features while preserving information. PCA (Principal Component Analysis) and t-SNE are key techniques. Essential for visualization, noise reduction, and computational efficiency."
          },
          {
            id: "association",
            label: "Association Rules",
            summary: "Discovers interesting relationships between variables in large datasets. Apriori and FP-Growth algorithms are commonly used. Applications include market basket analysis and recommendation systems."
          }
        ]
      },
      {
        id: "reinforcement",
        label: "Reinforcement Learning",
        color: "#F59E0B",
        summary: "Reinforcement learning trains agents to make sequences of decisions by rewarding desired behaviors. The agent learns through trial and error, maximizing cumulative rewards. It's the foundation of game-playing AI and robotics.",
        expanded: false,
        subtopics: [
          {
            id: "q-learning",
            label: "Q-Learning",
            summary: "Q-Learning is a model-free algorithm that learns the value of actions in states. It uses a Q-table to store state-action values and updates them based on rewards. Widely used in game AI and autonomous systems."
          },
          {
            id: "policy-gradient",
            label: "Policy Gradient",
            summary: "Policy gradient methods directly optimize the policy function. They work well in continuous action spaces and can learn stochastic policies. Used in robotics, natural language processing, and complex games."
          },
          {
            id: "dqn",
            label: "Deep Q-Networks",
            summary: "DQN combines Q-Learning with deep neural networks for complex environments. It uses experience replay and target networks for stable training. Notable success in playing Atari games at superhuman levels."
          }
        ]
      },
      {
        id: "deep-learning",
        label: "Deep Learning",
        color: "#8B5CF6",
        summary: "Deep learning uses neural networks with multiple layers to learn hierarchical representations of data. It has revolutionized computer vision, natural language processing, and speech recognition with state-of-the-art performance.",
        expanded: false,
        subtopics: [
          {
            id: "cnn",
            label: "CNNs",
            summary: "Convolutional Neural Networks are specialized for processing grid-like data such as images. They use convolutional layers to detect local patterns and spatial hierarchies. Dominant in image classification and object detection."
          },
          {
            id: "rnn",
            label: "RNNs",
            summary: "Recurrent Neural Networks process sequential data by maintaining internal state. LSTMs and GRUs are popular variants that handle long-term dependencies. Used in language modeling, translation, and time series analysis."
          },
          {
            id: "transformers",
            label: "Transformers",
            summary: "Transformer architecture uses self-attention mechanisms to process sequences in parallel. Powers modern language models like GPT and BERT. Breakthrough in NLP enabling human-like text generation and understanding."
          }
        ]
      }
    ],
    createdAt: new Date(Date.now() - 86400000)
  },
  {
    id: "2",
    title: "Calculus Fundamentals",
    topics: [
      {
        id: "derivatives",
        label: "Derivatives",
        color: "#8B5CF6",
        summary: "Derivatives measure the rate of change of a function. They represent the slope of the tangent line at any point on a curve. Fundamental to optimization, physics, and understanding dynamic systems.",
        expanded: false,
        subtopics: [
          {
            id: "power-rule",
            label: "Power Rule",
            summary: "The power rule states that d/dx[x^n] = nx^(n-1). It's the most basic differentiation rule and applies to polynomial functions. Essential for solving calculus problems efficiently."
          },
          {
            id: "chain-rule",
            label: "Chain Rule",
            summary: "The chain rule is used for differentiating composite functions. If y = f(g(x)), then dy/dx = f'(g(x)) · g'(x). Critical for handling nested functions and complex expressions."
          },
          {
            id: "product-rule",
            label: "Product Rule",
            summary: "For the product of two functions, d/dx[f(x)g(x)] = f'(x)g(x) + f(x)g'(x). Used when differentiating expressions involving multiplication of functions."
          }
        ]
      },
      {
        id: "integrals",
        label: "Integrals",
        color: "#EC4899",
        summary: "Integrals represent the accumulation of quantities and areas under curves. They are the inverse operation of derivatives. Used in calculating areas, volumes, and solving differential equations.",
        expanded: false,
        subtopics: [
          {
            id: "definite",
            label: "Definite Integrals",
            summary: "Definite integrals calculate the exact area under a curve between two points. They produce a numerical value. The Fundamental Theorem of Calculus connects derivatives and integrals."
          },
          {
            id: "indefinite",
            label: "Indefinite Integrals",
            summary: "Indefinite integrals represent a family of functions (antiderivatives). They include a constant of integration (+C). Used for finding general solutions to differential equations."
          },
          {
            id: "substitution",
            label: "U-Substitution",
            summary: "U-substitution is the reverse of the chain rule. It simplifies complex integrals by substituting a portion with a new variable. Essential technique for integration problems."
          }
        ]
      },
      {
        id: "limits",
        label: "Limits",
        color: "#06B6D4",
        summary: "Limits describe the behavior of functions as they approach specific values. They are the foundation of calculus, defining continuity, derivatives, and integrals. Essential for understanding instantaneous change.",
        expanded: false,
        subtopics: [
          {
            id: "continuity",
            label: "Continuity",
            summary: "A function is continuous if its limit equals its value at every point. No jumps, breaks, or holes in the graph. Continuous functions are predictable and well-behaved."
          },
          {
            id: "lhopital",
            label: "L'Hôpital's Rule",
            summary: "L'Hôpital's rule evaluates limits of indeterminate forms (0/0 or ∞/∞). It states that lim[f(x)/g(x)] = lim[f'(x)/g'(x)]. Powerful tool for solving challenging limit problems."
          },
          {
            id: "infinity",
            label: "Limits at Infinity",
            summary: "Limits at infinity describe end behavior of functions. They determine horizontal asymptotes and long-term trends. Important for understanding function behavior in extreme cases."
          }
        ]
      }
    ],
    createdAt: new Date(Date.now() - 172800000)
  }
];

interface MindMapBuilderProps {
  onNavigate?: (view: "landing" | "dashboard" | "chat" | "quiz" | "planner" | "notes" | "mindmap" | "leaderboard" | "timer" | "profile") => void;
}

export function MindMapBuilder({ onNavigate }: MindMapBuilderProps) {
  const [mindMaps, setMindMaps] = useState<MindMap[]>(sampleMindMaps);
  const [selectedMap, setSelectedMap] = useState<MindMap | null>(mindMaps[0]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<SubTopic | null>(null);
  const [newMapTitle, setNewMapTitle] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const createMindMap = async () => {
    if (!newMapTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setIsGenerating(true);
    toast.info("🤖 Generating topics and sub-topics for your mind map...");

    try {
      const result = await mindmapAPI.generate(newMapTitle);
      
      const newMap: MindMap = {
        id: result.id || Date.now().toString(),
        title: result.title || newMapTitle,
        topics: result.topics || [],
        createdAt: new Date()
      };

      setMindMaps([newMap, ...mindMaps]);
      setSelectedMap(newMap);
      setNewMapTitle("");
      setShowCreateForm(false);
      toast.success("Mind map generated successfully!");
    } catch (error: any) {
      console.error("Error generating mind map:", error);
      toast.error("Failed to generate mind map automatically.");
      
      // Fallback to empty map if API fails
      const newMap: MindMap = {
        id: Date.now().toString(),
        title: newMapTitle,
        topics: [],
        createdAt: new Date()
      };
      setMindMaps([newMap, ...mindMaps]);
      setSelectedMap(newMap);
      setNewMapTitle("");
      setShowCreateForm(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAIMindMap = async () => {
    if (!newMapTitle.trim()) {
      toast.error("Please enter a title in the 'New Map' form first to generate an AI map!");
      setShowCreateForm(true);
      return;
    }
    await createMindMap();
  };

  const deleteMindMap = (id: string) => {
    setMindMaps(mindMaps.filter(m => m.id !== id));
    if (selectedMap?.id === id) {
      setSelectedMap(mindMaps[0] || null);
      setSelectedTopic(null);
      setSelectedSubtopic(null);
    }
    toast.success("Mind map deleted");
  };

  const toggleTopicExpansion = (topicId: string) => {
    if (!selectedMap) return;
    
    const topic = selectedMap.topics.find(t => t.id === topicId);
    if (!topic) return;

    const updatedTopics = selectedMap.topics.map(t => 
      t.id === topicId ? { ...t, expanded: !t.expanded } : t
    );

    const updatedMap = { ...selectedMap, topics: updatedTopics };
    setSelectedMap(updatedMap);
    setMindMaps(mindMaps.map(m => m.id === selectedMap.id ? updatedMap : m));
    
    setSelectedTopic({ ...topic, expanded: !topic.expanded });
    setSelectedSubtopic(null);
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setSelectedSubtopic(null);
  };

  const handleSubtopicClick = (subtopic: SubTopic) => {
    setSelectedSubtopic(subtopic);
  };

  const downloadMindMap = async () => {
    if (!mapRef.current || !selectedMap) return;
    try {
      const dataUrl = await toPng(mapRef.current, { backgroundColor: '#020817' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${selectedMap.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_mindmap.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Mind map downloaded as PNG!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download mind map");
    }
  };

  const shareMindMap = async () => {
    if (!mapRef.current || !selectedMap) return;
    try {
      const blob = await toBlob(mapRef.current, { backgroundColor: '#020817' });
      if (!blob) throw new Error("Failed to generate blob");
      
      const file = new File([blob], `${selectedMap.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: selectedMap.title,
          text: 'Check out my mind map!',
          files: [file]
        });
        toast.success("Mind map shared!");
      } else {
        toast.error("Web Share API not supported on this browser/device for files.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to share mind map");
    }
  };

  // Calculate positions for radial layout
  const getNodePosition = (index: number, total: number, radius: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
      angle
    };
  };

  const getSubtopicPosition = (parentX: number, parentY: number, index: number, total: number, parentAngle: number) => {
    const spreadAngle = Math.PI / 4; // 45 degrees spread
    const startAngle = parentAngle - spreadAngle / 2;
    const angle = startAngle + (index * spreadAngle) / Math.max(total - 1, 1);
    const distance = 120;
    
    return {
      x: parentX + distance * Math.cos(angle),
      y: parentY + distance * Math.sin(angle)
    };
  };

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar - Mind Maps List */}
      {!fullscreen && (
        <div className="w-80 flex flex-col">
          <div className="glass-card p-4 rounded-xl mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg">My Mind Maps</h3>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex-1 gradient-blue hover:opacity-90 neon-border"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Map
              </Button>
              <Button
                variant="outline"
                onClick={generateAIMindMap}
                className="hover:bg-white/10"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="glass-card p-4 rounded-xl mb-4"
            >
              <Input
                value={newMapTitle}
                onChange={(e) => setNewMapTitle(e.target.value)}
                placeholder="Mind map title..."
                className="mb-3 bg-input-background border-white/10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createMindMap();
                }}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={createMindMap} 
                  disabled={isGenerating}
                  className="flex-1 gradient-blue hover:opacity-90 neon-border"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Create & Generate"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} disabled={isGenerating}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {mindMaps.map((map) => (
                <motion.div
                  key={map.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    className={`p-4 cursor-pointer transition-all ${
                      selectedMap?.id === map.id
                        ? "bg-blue-600/20 border-blue-600/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                        : "glass-card hover:bg-white/5"
                    }`}
                    onClick={() => {
                      setSelectedMap(map);
                      setSelectedTopic(null);
                      setSelectedSubtopic(null);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4>{map.title}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMindMap(map.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {map.topics.length} topics
                      </Badge>
                      <span>{map.createdAt.toLocaleDateString()}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content Area - Virtual Mind Map */}
      <div className="flex-1 glass-card p-6 rounded-xl flex flex-col">
        {selectedMap ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl mb-2">{selectedMap.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Click topics to expand • {selectedMap.topics.length} main branches
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFullscreen(!fullscreen)}
                  className="hover:bg-white/10"
                >
                  {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:bg-white/10"
                  onClick={shareMindMap}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  size="sm"
                  onClick={downloadMindMap}
                  className="gradient-blue hover:opacity-90 neon-border"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
              {/* Virtual Mind Map Canvas */}
              <div className={`${fullscreen || !selectedTopic ? 'flex-1' : 'w-1/2'} transition-all duration-300`}>
                <div ref={mapRef} className="h-full bg-gradient-to-br from-blue-950/20 via-background to-blue-950/10 rounded-lg border border-blue-600/20 overflow-hidden relative">
                  {selectedMap.topics.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <BookOpen className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No topics yet</p>
                        <p className="text-sm text-muted-foreground mt-2">Click the AI button to generate</p>
                      </div>
                    </div>
                  ) : (
                    <svg width="100%" height="100%" viewBox="0 0 800 600" className="drop-shadow-2xl">
                      <defs>
                        {/* Glow filters for nodes */}
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        
                        {/* Gradient definitions */}
                        {selectedMap.topics.map((topic) => (
                          <radialGradient key={`gradient-${topic.id}`} id={`gradient-${topic.id}`}>
                            <stop offset="0%" stopColor={topic.color} stopOpacity="0.8" />
                            <stop offset="100%" stopColor={topic.color} stopOpacity="0.3" />
                          </radialGradient>
                        ))}
                      </defs>

                      {/* Connections */}
                      <g opacity="0.4">
                        {selectedMap.topics.map((topic, index) => {
                          const pos = getNodePosition(index, selectedMap.topics.length, 180);
                          return (
                            <motion.line
                              key={`line-${topic.id}`}
                              x1="400"
                              y1="300"
                              x2={pos.x}
                              y2={pos.y}
                              stroke={topic.color}
                              strokeWidth="2"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 0.4 }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                            />
                          );
                        })}

                        {/* Subtopic connections */}
                        {selectedMap.topics.map((topic, topicIndex) => {
                          if (!topic.expanded) return null;
                          const parentPos = getNodePosition(topicIndex, selectedMap.topics.length, 180);
                          return topic.subtopics.map((subtopic, subIndex) => {
                            const subPos = getSubtopicPosition(
                              parentPos.x,
                              parentPos.y,
                              subIndex,
                              topic.subtopics.length,
                              parentPos.angle
                            );
                            return (
                              <motion.line
                                key={`subline-${subtopic.id}`}
                                x1={parentPos.x}
                                y1={parentPos.y}
                                x2={subPos.x}
                                y2={subPos.y}
                                stroke={topic.color}
                                strokeWidth="1.5"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.3 }}
                                transition={{ duration: 0.5, delay: subIndex * 0.1 }}
                              />
                            );
                          });
                        })}
                      </g>

                      {/* Central Node */}
                      <g>
                        <motion.circle
                          cx="400"
                          cy="300"
                          r="50"
                          fill="url(#gradient-center)"
                          filter="url(#glow)"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 10 }}
                        />
                        <circle
                          cx="400"
                          cy="300"
                          r="50"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          opacity="0.5"
                        />
                        <motion.circle
                          cx="400"
                          cy="300"
                          r="55"
                          fill="none"
                          stroke="#60A5FA"
                          strokeWidth="1"
                          opacity="0.3"
                          animate={{
                            r: [55, 60, 55],
                            opacity: [0.3, 0.1, 0.3]
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                        <text
                          x="400"
                          y="300"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          className="pointer-events-none select-none"
                        >
                          {selectedMap.title}
                        </text>
                      </g>

                      {/* Topic Nodes */}
                      {selectedMap.topics.map((topic, index) => {
                        const pos = getNodePosition(index, selectedMap.topics.length, 180);
                        const isSelected = selectedTopic?.id === topic.id;
                        
                        return (
                          <g key={topic.id}>
                            {/* Outer glow ring */}
                            <motion.circle
                              cx={pos.x}
                              cy={pos.y}
                              r={isSelected ? 50 : 40}
                              fill={`url(#gradient-${topic.id})`}
                              opacity="0.3"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ 
                                scale: 1, 
                                opacity: 0.3,
                                r: isSelected ? 50 : 40
                              }}
                              transition={{ delay: index * 0.1 + 0.3 }}
                            />
                            
                            {/* Main node */}
                            <motion.circle
                              cx={pos.x}
                              cy={pos.y}
                              r={isSelected ? 42 : 35}
                              fill={topic.color}
                              opacity="0.9"
                              filter="url(#glow)"
                              className="cursor-pointer"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ 
                                type: "spring", 
                                damping: 10,
                                delay: index * 0.1 + 0.3 
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                handleTopicClick(topic);
                                toggleTopicExpansion(topic.id);
                              }}
                            />
                            
                            {/* Selection ring */}
                            {isSelected && (
                              <motion.circle
                                cx={pos.x}
                                cy={pos.y}
                                r="47"
                                fill="none"
                                stroke={topic.color}
                                strokeWidth="2"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ 
                                  scale: 1, 
                                  opacity: 0.6,
                                  r: [47, 52, 47]
                                }}
                                transition={{ 
                                  r: { duration: 2, repeat: Infinity },
                                  scale: { duration: 0.3 },
                                  opacity: { duration: 0.3 }
                                }}
                              />
                            )}
                            
                            {/* Label */}
                            <text
                              x={pos.x}
                              y={pos.y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="white"
                              fontSize="13"
                              className="pointer-events-none select-none"
                            >
                              {topic.label}
                            </text>

                            {/* Subtopic Nodes */}
                            {topic.expanded && topic.subtopics.map((subtopic, subIndex) => {
                              const subPos = getSubtopicPosition(
                                pos.x,
                                pos.y,
                                subIndex,
                                topic.subtopics.length,
                                pos.angle
                              );
                              const isSubSelected = selectedSubtopic?.id === subtopic.id;
                              
                              return (
                                <g key={subtopic.id}>
                                  <motion.circle
                                    cx={subPos.x}
                                    cy={subPos.y}
                                    r={isSubSelected ? 28 : 25}
                                    fill={topic.color}
                                    opacity="0.7"
                                    filter="url(#glow)"
                                    className="cursor-pointer"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 0.7 }}
                                    transition={{ 
                                      delay: subIndex * 0.1,
                                      type: "spring",
                                      damping: 12
                                    }}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleSubtopicClick(subtopic)}
                                  />
                                  
                                  {isSubSelected && (
                                    <motion.circle
                                      cx={subPos.x}
                                      cy={subPos.y}
                                      r="32"
                                      fill="none"
                                      stroke={topic.color}
                                      strokeWidth="1.5"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1, opacity: 0.5 }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  )}
                                  
                                  <text
                                    x={subPos.x}
                                    y={subPos.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="white"
                                    fontSize="10"
                                    className="pointer-events-none select-none"
                                  >
                                    {subtopic.label.length > 12 
                                      ? subtopic.label.substring(0, 12) + '...'
                                      : subtopic.label}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>

              {/* Info Panel */}
              {!fullscreen && (selectedTopic || selectedSubtopic) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-1/2 flex flex-col"
                >
                  <Card className="flex-1 glass-card p-6 border border-blue-600/20 flex flex-col">
                    <AnimatePresence mode="wait">
                      {selectedSubtopic ? (
                        <motion.div
                          key={selectedSubtopic.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="h-full flex flex-col"
                        >
                          <div className="mb-4 pb-4 border-b border-white/10">
                            <Badge 
                              variant="outline" 
                              className="mb-3"
                              style={{
                                borderColor: `${selectedTopic?.color}50`,
                                backgroundColor: `${selectedTopic?.color}20`,
                              }}
                            >
                              {selectedTopic?.label}
                            </Badge>
                            <h2 className="text-2xl flex items-center gap-2">
                              <BookOpen className="w-6 h-6 text-blue-400" />
                              {selectedSubtopic.label}
                            </h2>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-blue-600/10 border border-blue-600/20">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {selectedSubtopic.summary}
                                </p>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    sessionStorage.setItem('pendingQuizTopic', selectedSubtopic.label);
                                    if (onNavigate) onNavigate("quiz");
                                  }}
                                >
                                  <Brain className="w-4 h-4 mr-2" />
                                  Generate Quiz
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    sessionStorage.setItem('pendingNotesTopic', selectedSubtopic.label);
                                    if (onNavigate) onNavigate("notes");
                                  }}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Notes
                                </Button>
                              </div>
                            </div>
                          </ScrollArea>
                        </motion.div>
                      ) : selectedTopic ? (
                        <motion.div
                          key={selectedTopic.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="h-full flex flex-col"
                        >
                          <div className="mb-4 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ 
                                  backgroundColor: selectedTopic.color,
                                  boxShadow: `0 0 15px ${selectedTopic.color}50`
                                }}
                              />
                              <Badge variant="outline">Main Topic</Badge>
                            </div>
                            <h2 className="text-2xl flex items-center gap-2">
                              <Sparkles className="w-6 h-6 text-blue-400" />
                              {selectedTopic.label}
                            </h2>
                          </div>
                          <ScrollArea className="flex-1">
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-blue-600/10 border border-blue-600/20">
                                <p className="text-muted-foreground leading-relaxed">
                                  {selectedTopic.summary}
                                </p>
                              </div>
                              
                              {selectedTopic.subtopics.length > 0 && (
                                <div>
                                  <p className="text-sm mb-3 flex items-center gap-2">
                                    <span className="text-muted-foreground">Explore subtopics:</span>
                                    {!selectedTopic.expanded && (
                                      <span className="text-xs text-blue-400">(click to expand on map)</span>
                                    )}
                                  </p>
                                  <div className="space-y-2">
                                    {selectedTopic.subtopics.map((subtopic) => (
                                      <motion.div
                                        key={subtopic.id}
                                        whileHover={{ x: 4 }}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                                          selectedSubtopic?.id === subtopic.id
                                            ? "bg-blue-500/20 border border-blue-500/30"
                                            : "bg-white/5 hover:bg-white/10 border border-white/10"
                                        }`}
                                        onClick={() => handleSubtopicClick(subtopic)}
                                      >
                                        <p className="text-sm">{subtopic.label}</p>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <Sparkles className="w-16 h-16 text-blue-400 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Select or create a mind map to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

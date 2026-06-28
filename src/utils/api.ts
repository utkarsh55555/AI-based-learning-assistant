import { toast } from "sonner";
import { getCsrfToken, clearSession as secClearSession, isTokenValid } from './security';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

let useMockApi = false;
let toastShown = false;

// HTTP methods that require a CSRF token
const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function showMockWarning() {
  if (!toastShown) {
    toastShown = true;
    try {
      toast.warning("Backend server offline. Running in client-side Demo Mode.", {
        description: "All features are fully functional. Your progress will be saved in your browser.",
        duration: 8000,
      });
    } catch (e) {
      console.warn("Failed to show toast:", e);
    }
  }
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('access_token');
  // If they have the mock token, clear it so they are forced to log in with the real backend
  if (token === 'mock-access-token') {
    console.warn('Mock token detected, clearing session to connect to real backend');
    secClearSession();
    return null;
  }
  if (token && !isTokenValid(token)) {
    console.warn('Invalid token format detected, clearing session');
    secClearSession();
    return null;
  }
  return token;
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const method = (options.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach CSRF token for all state-changing requests
  if (CSRF_METHODS.has(method) && !useMockApi) {
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    } catch {
      // Non-fatal — backend will reject if CSRF is strictly required
    }
  }

  if (useMockApi) {
    return handleMockRequest<T>(endpoint, options);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      
      // If auth error, clear tokens and CSRF cache
      if (response.status === 401 || (error.message && error.message.includes('token'))) {
        console.warn('Auth error detected, clearing session');
        secClearSession();
      }
      
      // Only fall back to mock API for true DNS/infrastructure failures, NOT for
      // AI service errors (timeouts, rate limits, etc.) which should show as errors.
      if (response.status === 500) {
        const msg = (error.message || '').toLowerCase();
        const isTrueInfraFailure =
          msg.includes('getaddrinfo') ||
          msg.includes('name or service not known') ||
          (msg.includes('supabase') && msg.includes('connection'));
        
        if (isTrueInfraFailure) {
          console.warn(`Backend infrastructure unreachable: ${error.message}. Switching to client-side Mock API.`);
          useMockApi = true;
          showMockWarning();
          return handleMockRequest<T>(endpoint, options);
        }
      }
      
      throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error: any) {
    // Only handle true network failures (server completely unreachable)
    // NOT application-level errors that happen to contain 'failed' in the message
    const isNetworkError = error.name === 'TypeError' && (
      error.message.toLowerCase().includes('fetch') || 
      error.message.toLowerCase().includes('networkerror') ||
      error.message === 'Failed to fetch'
    );
    
    if (isNetworkError) {
      console.warn(`Connection failed to backend at ${API_BASE_URL}. Switching to client-side Mock API.`);
      useMockApi = true;
      showMockWarning();
      return handleMockRequest<T>(endpoint, options);
    }
    throw error;
  }
}

// Helper functions for mock database
const getMockData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(`mock_${key}`);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

const setMockData = <T>(key: string, value: T): void => {
  localStorage.setItem(`mock_${key}`, JSON.stringify(value));
};

// Mock AI Chat Response Generator
function getMockChatResponse(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("hello") || msg.includes("hi ") || msg === "hi" || msg.includes("hey")) {
    return "Hello! I'm your Obsidian AI Tutor. What subject are we mastering today? I can explain concepts, generate quizzes, or build mind maps to help you learn! 📚";
  }
  if (msg.includes("calculus") || msg.includes("derivative") || msg.includes("math")) {
    return `### Calculus & Derivatives

In calculus, the **derivative** measures how a function changes as its input changes. 

For a function $f(x)$, the derivative is denoted as $f'(x)$ or $\\frac{dy}{dx}$.

#### Core Rules:
1. **Power Rule**: $\\frac{d}{dx}(x^n) = n x^{n-1}$
   - *Example*: The derivative of $x^2$ is $2x$.
2. **Product Rule**: $(uv)' = u'v + uv'$
3. **Chain Rule**: $\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$

Would you like me to generate a practice quiz on this topic to test your understanding? 📐`;
  }
  if (msg.includes("python") || msg.includes("programming") || msg.includes("code")) {
    return `### Python Programming Basics

Python is a high-level, interpreted programming language known for its readability.

Here is a quick example of a function that reverses a string (a classic computer science problem):

\`\`\`python
def reverse_string(text: str) -> str:
    # Uses slicing syntax [start:stop:step]
    # -1 step moves backwards through the string
    return text[::-1]

# Example usage:
print(reverse_string("obsidian")) # Output: naidisbo
\`\`\`

#### Key Concepts to Master:
- List comprehensions: \`[x**2 for x in range(5)]\`
- Decorators and Generators
- Object-Oriented Programming (Classes and Inheritance)

Let me know if you want a coding quiz or if you'd like to create a study plan for learning Python! 🐍`;
  }
  if (msg.includes("photosynthesis") || msg.includes("science") || msg.includes("biology")) {
    return `### Photosynthesis

**Photosynthesis** is the process used by plants, algae, and certain bacteria to harness energy from sunlight and turn it into chemical energy.

#### The Chemical Equation:
$$6CO_2 + 6H_2O \\xrightarrow{\\text{light}} C_6H_{12}O_6 + 6O_2$$

#### Two Main Stages:
1. **Light-Dependent Reactions**: Occur in the thylakoid membranes, converting light energy into ATP and NADPH, releasing oxygen ($O_2$).
2. **Calvin Cycle (Light-Independent)**: Occurs in the stroma, using ATP and NADPH to convert carbon dioxide ($CO_2$) into glucose ($C_6H_{12}O_6$).

Would you like to build a visual **Mind Map** of photosynthesis? 🌿`;
  }
  if (msg.includes("machine learning") || msg.includes("ml") || msg.includes("ai")) {
    return `### Machine Learning (ML)

Machine Learning is a subset of Artificial Intelligence that enables computers to learn from data without being explicitly programmed.

#### Three Primary Paradigms:
1. **Supervised Learning**: Model learns from labeled training data (e.g., Linear Regression, Random Forests, Neural Networks).
2. **Unsupervised Learning**: Model finds hidden patterns or structures in unlabeled data (e.g., K-Means Clustering, PCA).
3. **Reinforcement Learning**: Agent learns to make decisions by performing actions and receiving rewards/penalties.

What ML topic should we deep dive into next? 🤖`;
  }
  
  const fallbacks = [
    `That is a fascinating question about **${message}**!

Let's break down this concept into its key elements:
1. **Definition**: The core principles and ideas defining this topic.
2. **Application**: How this is utilized in real-world scenarios and industries.
3. **Core Elements**: The main building blocks or subtopics associated with it.

I can write detailed study notes or generate an interactive practice quiz on this topic to test your knowledge. What would you prefer? 🌟`,
    
    `I'd be glad to help you master **${message}**!

Here is a summary of what you need to know:
- **Core Concept**: Understanding the primary theories and functions.
- **Key Relationships**: How this connects to broader fields.
- **Practical Application**: Implementing these ideas in exercises or real-life problems.

Let's start by generating a **Mind Map** for this topic to help you visualize the structure, or launch a **Focus Session** using the Study Timer! 🚀`
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Mock Question Generator
function generateMockQuestions(topic: string): any[] {
  const cleanTopic = topic.toLowerCase();
  if (cleanTopic.includes("math") || cleanTopic.includes("calculus") || cleanTopic.includes("derivative")) {
    return [
      {
        question: "What is the derivative of x²?",
        options: ["x", "2x", "x²", "2x²"],
        correct: 1,
        explanation: "Using the power rule (d/dx[xⁿ] = nxⁿ⁻¹), the derivative of x² is 2x¹ = 2x.",
        difficulty: "medium"
      },
      {
        question: "What is the integral of 1/x?",
        options: ["ln|x| + C", "-1/x² + C", "e^x + C", "x + C"],
        correct: 0,
        explanation: "The antiderivative of 1/x is ln|x| plus a constant C.",
        difficulty: "medium"
      },
      {
        question: "What is the derivative of sin(x)?",
        options: ["-sin(x)", "cos(x)", "-cos(x)", "tan(x)"],
        correct: 1,
        explanation: "The rate of change of sin(x) with respect to x is cos(x).",
        difficulty: "easy"
      },
      {
        question: "Calculate the derivative of e^(2x).",
        options: ["e^(2x)", "2e^(2x)", "e^x", "2x e^(2x-1)"],
        correct: 1,
        explanation: "Using the chain rule, d/dx[e^(2x)] = e^(2x) * d/dx[2x] = 2e^(2x).",
        difficulty: "medium"
      },
      {
        question: "If f(x) = c (a constant), what is f'(x)?",
        options: ["c", "1", "0", "x"],
        correct: 2,
        explanation: "The derivative of any constant function is 0 because constants do not change.",
        difficulty: "easy"
      }
    ];
  }
  if (cleanTopic.includes("python") || cleanTopic.includes("coding") || cleanTopic.includes("program")) {
    return [
      {
        question: "Which of the following is the correct slice syntax to reverse string 's' in Python?",
        options: ["s[::1]", "s[::-1]", "reverse(s)", "s[-1::]"],
        correct: 1,
        explanation: "The slice syntax s[::-1] takes the entire string with a step size of -1, effectively reversing it.",
        difficulty: "medium"
      },
      {
        question: "What does the 'len()' function do in Python?",
        options: ["Generates a list of numbers", "Finds the index of a character", "Returns the number of items in an object", "Converts a string to lowercase"],
        correct: 2,
        explanation: "len() returns the length (the number of items) of an object like a list, string, tuple, or dictionary.",
        difficulty: "easy"
      },
      {
        question: "How do you define a function in Python?",
        options: ["def function_name():", "function function_name():", "define function_name():", "func function_name():"],
        correct: 0,
        explanation: "Python uses the 'def' keyword followed by the function name, parentheses, and a colon.",
        difficulty: "easy"
      },
      {
        question: "Which of the following data types is immutable in Python?",
        options: ["List", "Dictionary", "Set", "Tuple"],
        correct: 3,
        explanation: "Tuples are immutable sequences, meaning their values cannot be changed or modified after creation.",
        difficulty: "medium"
      },
      {
        question: "What is the output of print(2 ** 3) in Python?",
        options: ["6", "8", "9", "5"],
        correct: 1,
        explanation: "The double asterisk (**) operator represents exponentiation in Python, so 2 ** 3 = 8.",
        difficulty: "easy"
      }
    ];
  }
  if (cleanTopic.includes("science") || cleanTopic.includes("photosynthesis") || cleanTopic.includes("biology")) {
    return [
      {
        question: "Which pigment is primarily responsible for absorbing light during photosynthesis?",
        options: ["Carotenoid", "Chlorophyll a", "Phycobilin", "Anthocyanin"],
        correct: 1,
        explanation: "Chlorophyll a is the primary pigment involved in photosynthesis, absorbing blue-violet and red light.",
        difficulty: "easy"
      },
      {
        question: "What are the primary products of photosynthesis?",
        options: ["Carbon dioxide and Water", "Glucose and Oxygen", "ATP and Carbon dioxide", "Nitrogen and Water"],
        correct: 1,
        explanation: "Plants use sunlight to convert carbon dioxide and water into glucose (sugar) and oxygen.",
        difficulty: "easy"
      },
      {
        question: "Where do the light-dependent reactions of photosynthesis take place?",
        options: ["Stroma", "Mitochondria", "Thylakoid membranes", "Cytoplasm"],
        correct: 2,
        explanation: "The light reactions happen within the thylakoid membranes where chlorophyll is housed.",
        difficulty: "medium"
      },
      {
        question: "Which of the following is NOT required for photosynthesis to occur?",
        options: ["Light", "Water", "Oxygen", "Carbon dioxide"],
        correct: 2,
        explanation: "Oxygen is a byproduct (output) of photosynthesis, not an input requirement.",
        difficulty: "easy"
      },
      {
        question: "What is the tiny pores on the underside of leaves that regulate gas exchange called?",
        options: ["Grana", "Stomata", "Chloroplasts", "Stroma"],
        correct: 1,
        explanation: "Stomata are microscopic pores that open and close to allow carbon dioxide in and oxygen/water vapor out.",
        difficulty: "medium"
      }
    ];
  }
  
  return [
    {
      question: `What is the primary definition or scope of ${topic}?`,
      options: [
        `A foundational concept involving key principles of ${topic}.`,
        "A system designed solely for secondary applications.",
        "An obsolete methodology replaced by modern frameworks.",
        "A temporary state observed only in laboratory environments."
      ],
      correct: 0,
      explanation: `The core definition of ${topic} centers around its fundamental theories and practical implementations.`,
      difficulty: "easy"
    },
    {
      question: `Which of the following is considered a key advantage of studying or applying ${topic}?`,
      options: [
        "It eliminates the need for computational resources.",
        `It provides structured insight and improves problem-solving in related areas.`,
        "It guarantees instantaneous success with zero effort.",
        "It isolates the subject from all other scientific fields."
      ],
      correct: 1,
      explanation: `Studying ${topic} develops analytical skills and helps optimize processes in respective environments.`,
      difficulty: "medium"
    },
    {
      question: `What is a common challenge or limitation associated with ${topic}?`,
      options: [
        `Complexity of integration and the requirement of strong foundational knowledge.`,
        "It is illegal in most countries.",
        "It requires a physical connection to the Earth's core.",
        "It only works during daytime hours."
      ],
      correct: 0,
      explanation: `Like most academic disciplines, ${topic} presents conceptual challenges that require active study and practice.`,
      difficulty: "medium"
    },
    {
      question: `Which field benefits most directly from the principles of ${topic}?`,
      options: [
        "Culinary arts and gastronomy.",
        "Classical music production.",
        "Deep-sea navigation.",
        `Research, technology development, and academic learning.`
      ],
      correct: 3,
      explanation: `The theories in ${topic} directly drive innovation, academic research, and tech applications.`,
      difficulty: "easy"
    },
    {
      question: `How does modern technology impact the development of ${topic}?`,
      options: [
        "It makes it completely redundant.",
        "It restricts public access to the topic.",
        `It enhances research efficiency, simulation accuracy, and accessibility.`,
        "It decreases interest among younger students."
      ],
      correct: 2,
      explanation: `Modern digital tools, AI engines, and simulators allow students and experts to study and apply ${topic} much more effectively.`,
      difficulty: "medium"
    }
  ];
}

// Mock Mind Map Generator
function generateMockMindmap(topic: string): any[] {
  return [
    {
      id: "root",
      label: topic,
      x: 400,
      y: 300,
      isRoot: true,
      description: `Central hub for everything related to ${topic}.`
    },
    {
      id: "node1",
      parentId: "root",
      label: "Core Concepts",
      x: 200,
      y: 150,
      description: `The basic principles, terminologies, and building blocks of ${topic}.`
    },
    {
      id: "node1-1",
      parentId: "node1",
      label: "Foundational Theories",
      x: 100,
      y: 100,
      description: "Fundamental ideas that form the base of this topic."
    },
    {
      id: "node1-2",
      parentId: "node1",
      label: "Key Terminology",
      x: 100,
      y: 200,
      description: "Definitions of essential vocabulary and notations."
    },
    {
      id: "node2",
      parentId: "root",
      label: "Key Applications",
      x: 600,
      y: 150,
      description: `Where and how ${topic} is applied in practical scenarios.`
    },
    {
      id: "node2-1",
      parentId: "node2",
      label: "Industry Use Cases",
      x: 700,
      y: 100,
      description: "How companies and professionals implement these concepts."
    },
    {
      id: "node2-2",
      parentId: "node2",
      label: "Problem Solving",
      x: 700,
      y: 200,
      description: "Applying methods to resolve complex technical or theoretical problems."
    },
    {
      id: "node3",
      parentId: "root",
      label: "Common Challenges",
      x: 200,
      y: 450,
      description: "Difficult hurdles and common misconceptions encountered by learners."
    },
    {
      id: "node4",
      parentId: "root",
      label: "Future Trends",
      x: 600,
      y: 450,
      description: "Emerging concepts, updates, and upcoming directions."
    }
  ];
}

// Mock Notes Generator
function generateMockNotes(topic: string, subject?: string) {
  const formulas = topic.toLowerCase().includes("math") || topic.toLowerCase().includes("calculus") 
    ? ["d/dx [x^n] = n x^(n-1)", "∫ 1/x dx = ln|x| + C", "f'(x) = lim(h->0) [f(x+h) - f(x)]/h"]
    : topic.toLowerCase().includes("science") || topic.toLowerCase().includes("photosynthesis")
    ? ["6CO2 + 6H2O + light -> C6H12O6 + 6O2", "E = mc²"]
    : [];

  return {
    title: topic.charAt(0).toUpperCase() + topic.slice(1),
    summary: `This study guide provides a comprehensive summary of ${topic}, explaining its fundamental concepts, key applications, and practical formulas.`,
    content: `# Understanding ${topic}\n\n${topic} is a vital subject area. Master it by focusing on the core principles outlined below.\n\n## Section 1: Introduction\nStart with the essential vocabulary and basic rules. Make sure you understand the initial definitions before proceeding to practical applications.\n\n## Section 2: Deep Dive\nReview the examples and practice daily. Consistency is the key to building strong mental models for this topic.\n\n## Section 3: Summary\nUse quizzes and mind maps to evaluate your learning progress.`,
    keyPoints: [
      `Understand the basic definition and context of ${topic}.`,
      "Analyze the primary components or sub-categories.",
      "Review common real-world examples and use cases.",
      "Practice solving problems to reinforce theoretical knowledge."
    ],
    examples: [
      `A typical scenario where ${topic} is applied in research or engineering.`,
      "Step-by-step resolution of a conceptual question."
    ],
    formulas: formulas,
    relatedTopics: [
      "Advanced Study Methods",
      "Cognitive Mapping",
      "Adaptive Learning Systems"
    ]
  };
}

// Handle Mock Client Requests
async function handleMockRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : null;

  // Simulate minimal latency for realism
  await new Promise(resolve => setTimeout(resolve, 300));

  // --- AUTH ---
  if (endpoint === '/api/auth/signup') {
    const { email, password, name } = body;
    const users = getMockData<any[]>('users', []);
    const newUser = {
      id: Math.random().toString(36).substring(7),
      email,
      name,
      total_xp: 0,
      current_streak: 0,
      is_new_user: true
    };
    users.push({ ...newUser, password });
    setMockData('users', users);
    
    // Set current active session user
    setMockData('current_user', newUser);
    return {
      user: newUser,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    } as any as T;
  }

  if (endpoint === '/api/auth/login') {
    const { email, password } = body;
    const users = getMockData<any[]>('users', []);
    let user = users.find(u => u.email === email);
    
    if (!user) {
      // Auto-register for easy demo logins
      user = {
        id: Math.random().toString(36).substring(7),
        email,
        name: email.split('@')[0],
        total_xp: 150,
        current_streak: 1,
        is_new_user: false
      };
      users.push({ ...user, password });
      setMockData('users', users);
    }
    
    setMockData('current_user', user);
    return {
      user,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    } as any as T;
  }

  if (endpoint === '/api/auth/logout') {
    localStorage.removeItem('mock_current_user');
    return { message: "Logged out" } as any as T;
  }

  if (endpoint === '/api/auth/me') {
    const user = getMockData<any>('current_user', {
      id: 'mock-user-id',
      email: 'student@obsidian.edu',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    return { user } as any as T;
  }

  if (endpoint === '/api/user/profile' && method === 'PUT') {
    const user = getMockData<any>('current_user', {
      id: 'mock-user-id',
      email: 'student@obsidian.edu',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    
    const updatedUser = {
      ...user,
      name: body.name || user.name,
      avatar_url: body.avatar_url || user.avatar_url
    };
    
    setMockData('current_user', updatedUser);
    
    // Also update in users array
    const users = getMockData<any[]>('users', []);
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = updatedUser;
      setMockData('users', users);
    }
    
    return updatedUser as any as T;
  }

  // --- TUTOR / CHAT ---
  if (endpoint === '/api/tutor/chat') {
    const { message, conversation_history } = body;
    const reply = getMockChatResponse(message);
    const newHistory = [...(conversation_history || []), { role: 'user', content: message }, { role: 'assistant', content: reply }];
    return {
      response: reply,
      conversation_history: newHistory
    } as any as T;
  }

  if (endpoint === '/api/tutor/explain') {
    const { topic } = body;
    return { explanation: getMockChatResponse(topic) } as any as T;
  }

  // --- QUIZZES ---
  if (endpoint === '/api/quiz/generate') {
    const { topic, difficulty } = body;
    const quizId = Math.random().toString(36).substring(7);
    const questions = generateMockQuestions(topic);
    
    const newQuiz = {
      id: quizId,
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Quiz`,
      topic,
      difficulty,
      questions
    };
    
    const quizzes = getMockData<any[]>('quizzes', []);
    quizzes.push(newQuiz);
    setMockData('quizzes', quizzes);
    return newQuiz as any as T;
  }

  if (endpoint.startsWith('/api/quiz/') && endpoint.endsWith('/submit')) {
    const parts = endpoint.split('/');
    const quizId = parts[3];
    const { answers, time_taken } = body;
    
    const quizzes = getMockData<any[]>('quizzes', []);
    const quiz = quizzes.find(q => q.id === quizId);
    
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    let score = 0;
    const results = quiz.questions.map((q: any, i: number) => {
      const isCorrect = answers[i] === q.correct;
      if (isCorrect) score++;
      return {
        question: q.question,
        user_answer: answers[i],
        correct_answer: q.correct,
        is_correct: isCorrect
      };
    });

    const xpEarned = score * 50; // 50 XP per correct answer
    
    // Update user stats
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      email: 'student@obsidian.edu',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    currentUser.total_xp += xpEarned;
    currentUser.current_streak = Math.max(currentUser.current_streak, 1);
    setMockData('current_user', currentUser);
    
    // Save attempt to history
    const history = getMockData<any[]>('quiz_history', []);
    const attempt = {
      id: Math.random().toString(36).substring(7),
      quiz_id: quizId,
      quiz_title: quiz.title,
      score,
      total: quiz.questions.length,
      percentage: (score / quiz.questions.length) * 100,
      time_taken,
      date: new Date().toISOString()
    };
    history.unshift(attempt);
    setMockData('quiz_history', history);

    return {
      attempt,
      results,
      score,
      total: quiz.questions.length,
      percentage: (score / quiz.questions.length) * 100,
      xp: { xp_earned: xpEarned }
    } as any as T;
  }

  if (endpoint === '/api/quiz/history') {
    return getMockData<any[]>('quiz_history', []) as any as T;
  }

  if (endpoint === '/api/quiz/stats') {
    const history = getMockData<any[]>('quiz_history', []);
    const total = history.length;
    const avgScore = total > 0 ? history.reduce((sum, h) => sum + h.percentage, 0) / total : 0;
    return {
      total_attempts: total,
      average_percentage: avgScore,
      total_correct: history.reduce((sum, h) => sum + h.score, 0),
      total_questions: history.reduce((sum, h) => sum + h.total, 0)
    } as any as T;
  }

  if (endpoint.startsWith('/api/quiz/')) {
    const parts = endpoint.split('/');
    const quizId = parts[3];
    const quizzes = getMockData<any[]>('quizzes', []);
    const quiz = quizzes.find(q => q.id === quizId);
    if (!quiz) throw new Error("Quiz not found");
    return quiz as any as T;
  }

  // --- NOTES ---
  if (endpoint === '/api/notes/generate') {
    const { topic, subject } = body;
    const aiData = generateMockNotes(topic, subject);
    const noteId = Math.random().toString(36).substring(7);
    
    const newNote = {
      id: noteId,
      title: aiData.title,
      content: aiData.content,
      tags: [subject || 'General', 'AI-Generated'],
      subject: subject || 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const notes = getMockData<any[]>('notes', []);
    notes.unshift(newNote);
    setMockData('notes', notes);
    
    return {
      note: newNote,
      ai_data: aiData
    } as any as T;
  }

  if (endpoint === '/api/notes' && method === 'POST') {
    const { title, content, tags, subject } = body;
    const newNote = {
      id: Math.random().toString(36).substring(7),
      title,
      content,
      tags: tags || [],
      subject: subject || 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const notes = getMockData<any[]>('notes', []);
    notes.unshift(newNote);
    setMockData('notes', notes);
    return newNote as any as T;
  }

  if (endpoint.startsWith('/api/notes?')) {
    const notes = getMockData<any[]>('notes', []);
    return notes as any as T;
  }

  if (endpoint === '/api/notes') {
    return getMockData<any[]>('notes', []) as any as T;
  }

  if (endpoint.startsWith('/api/notes/search')) {
    const url = new URL(endpoint, 'http://dummy.com');
    const query = url.searchParams.get('q')?.toLowerCase() || '';
    const notes = getMockData<any[]>('notes', []);
    const filtered = notes.filter(n => 
      n.title.toLowerCase().includes(query) || 
      n.content.toLowerCase().includes(query)
    );
    return filtered as any as T;
  }

  if (endpoint.startsWith('/api/notes/') && method === 'GET') {
    const id = endpoint.split('/')[3];
    const notes = getMockData<any[]>('notes', []);
    const note = notes.find(n => n.id === id);
    if (!note) throw new Error("Note not found");
    return note as any as T;
  }

  if (endpoint.startsWith('/api/notes/') && method === 'PUT') {
    const id = endpoint.split('/')[3];
    const notes = getMockData<any[]>('notes', []);
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) throw new Error("Note not found");
    
    notes[idx] = {
      ...notes[idx],
      ...body,
      updated_at: new Date().toISOString()
    };
    setMockData('notes', notes);
    return notes[idx] as any as T;
  }

  if (endpoint.startsWith('/api/notes/') && method === 'DELETE') {
    const id = endpoint.split('/')[3];
    let notes = getMockData<any[]>('notes', []);
    notes = notes.filter(n => n.id !== id);
    setMockData('notes', notes);
    return { success: true } as any as T;
  }

  // --- MIND MAPS ---
  if (endpoint === '/api/mindmap/generate') {
    const { topic } = body;
    const mapId = Math.random().toString(36).substring(7);
    const topics = generateMockMindmap(topic);
    
    const newMap = {
      id: mapId,
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Mind Map`,
      topics,
      ai_generated: true,
      created_at: new Date().toISOString()
    };
    
    const mindmaps = getMockData<any[]>('mindmaps', []);
    mindmaps.unshift(newMap);
    setMockData('mindmaps', mindmaps);
    return newMap as any as T;
  }

  if (endpoint === '/api/mindmap' && method === 'POST') {
    const { title, topics } = body;
    const newMap = {
      id: Math.random().toString(36).substring(7),
      title,
      topics: topics || [],
      ai_generated: false,
      created_at: new Date().toISOString()
    };
    
    const mindmaps = getMockData<any[]>('mindmaps', []);
    mindmaps.unshift(newMap);
    setMockData('mindmaps', mindmaps);
    return newMap as any as T;
  }

  if (endpoint === '/api/mindmap') {
    return getMockData<any[]>('mindmaps', []) as any as T;
  }

  if (endpoint.startsWith('/api/mindmap/') && method === 'GET') {
    const id = endpoint.split('/')[3];
    const mindmaps = getMockData<any[]>('mindmaps', []);
    const map = mindmaps.find(m => m.id === id);
    if (!map) throw new Error("Mindmap not found");
    return map as any as T;
  }

  if (endpoint.startsWith('/api/mindmap/') && method === 'PUT') {
    const id = endpoint.split('/')[3];
    const mindmaps = getMockData<any[]>('mindmaps', []);
    const idx = mindmaps.findIndex(m => m.id === id);
    if (idx === -1) throw new Error("Mindmap not found");
    
    mindmaps[idx] = {
      ...mindmaps[idx],
      ...body
    };
    setMockData('mindmaps', mindmaps);
    return mindmaps[idx] as any as T;
  }

  if (endpoint.startsWith('/api/mindmap/') && method === 'DELETE') {
    const id = endpoint.split('/')[3];
    let mindmaps = getMockData<any[]>('mindmaps', []);
    mindmaps = mindmaps.filter(m => m.id !== id);
    setMockData('mindmaps', mindmaps);
    return { success: true } as any as T;
  }

  // --- STUDY PLANNER ---
  if (endpoint === '/api/study/plan' && method === 'POST') {
    const { subject, duration_weeks, current_level } = body;
    const planId = Math.random().toString(36).substring(7);
    
    const weeks = Array.from({ length: duration_weeks || 4 }, (_, i) => ({
      week: i + 1,
      title: `Week ${i + 1}: ${subject} Core Mastery`,
      tasks: [
        { id: `t-${i}-1`, title: `Introduction to ${subject} Concepts`, completed: false },
        { id: `t-${i}-2`, title: `Detailed Video Lecture & Textbook Study`, completed: false },
        { id: `t-${i}-3`, title: `Practice Exercises & Chapter Quiz`, completed: false }
      ]
    }));

    const newPlan = {
      id: planId,
      subject,
      duration_weeks: duration_weeks || 4,
      current_level: current_level || 'intermediate',
      progress: 0,
      weeks
    };
    
    const plans = getMockData<any[]>('study_plans', []);
    plans.unshift(newPlan);
    setMockData('study_plans', plans);
    return newPlan as any as T;
  }

  if (endpoint === '/api/study/plans') {
    return getMockData<any[]>('study_plans', []) as any as T;
  }

  if (endpoint.startsWith('/api/study/plan/') && endpoint.endsWith('/progress') && method === 'PUT') {
    const parts = endpoint.split('/');
    const planId = parts[4];
    const { progress } = body;
    
    const plans = getMockData<any[]>('study_plans', []);
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) throw new Error("Plan not found");
    
    plans[idx].progress = progress;
    // Autocomplete tasks depending on progress for demonstration
    plans[idx].weeks = plans[idx].weeks.map((w: any, wi: number) => {
      const isWeekPassed = progress >= ((wi + 1) / plans[idx].weeks.length) * 100;
      return {
        ...w,
        tasks: w.tasks.map((t: any) => ({
          ...t,
          completed: isWeekPassed ? true : t.completed
        }))
      };
    });
    
    setMockData('study_plans', plans);
    return plans[idx] as any as T;
  }

  if (endpoint.startsWith('/api/study/plan/')) {
    const id = endpoint.split('/')[4];
    const plans = getMockData<any[]>('study_plans', []);
    const plan = plans.find(p => p.id === id);
    if (!plan) throw new Error("Plan not found");
    return plan as any as T;
  }

  if (endpoint === '/api/study/session' && method === 'POST') {
    const { duration_minutes, subject, notes } = body;
    const xpEarned = Math.floor(duration_minutes * 2);
    
    // Update profile XP
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      email: 'student@obsidian.edu',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    currentUser.total_xp += xpEarned;
    setMockData('current_user', currentUser);

    const session = {
      id: Math.random().toString(36).substring(7),
      duration_minutes,
      subject: subject || 'General Study',
      notes: notes || '',
      date: new Date().toISOString(),
      xp_earned: xpEarned
    };
    
    const sessions = getMockData<any[]>('study_sessions', []);
    sessions.unshift(session);
    setMockData('study_sessions', sessions);
    return session as any as T;
  }

  if (endpoint.startsWith('/api/study/stats')) {
    const sessions = getMockData<any[]>('study_sessions', []);
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    return {
      total_sessions: sessions.length,
      total_minutes: totalMinutes,
      xp_earned: Math.floor(totalMinutes * 2),
      sessions
    } as any as T;
  }

  // --- LEADERBOARD ---
  if (endpoint.startsWith('/api/leaderboard/global')) {
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    
    const mockLeaders = [
      { id: '1', name: 'Sophia Chen', total_xp: 4500, current_streak: 15, avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
      { id: '2', name: 'Alex Mercer', total_xp: 3820, current_streak: 12, avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
      { id: '3', name: 'Liam Davies', total_xp: 3100, current_streak: 9, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
      { id: currentUser.id || 'mock-user-id', name: currentUser.name, total_xp: currentUser.total_xp, current_streak: currentUser.current_streak, is_user: true },
      { id: '4', name: 'Elena Rostova', total_xp: 2100, current_streak: 5, avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' },
      { id: '5', name: 'Tariq Al-Mansoor', total_xp: 1850, current_streak: 4, avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100' }
    ];

    // Sort by XP
    mockLeaders.sort((a, b) => b.total_xp - a.total_xp);
    return mockLeaders as any as T;
  }

  if (endpoint.startsWith('/api/leaderboard/streak')) {
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    
    const mockLeaders = [
      { id: '1', name: 'Sophia Chen', total_xp: 4500, current_streak: 15, avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
      { id: '2', name: 'Alex Mercer', total_xp: 3820, current_streak: 12, avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
      { id: currentUser.id || 'mock-user-id', name: currentUser.name, total_xp: currentUser.total_xp, current_streak: currentUser.current_streak, is_user: true },
      { id: '3', name: 'Liam Davies', total_xp: 3100, current_streak: 9, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
      { id: '4', name: 'Elena Rostova', total_xp: 2100, current_streak: 5, avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' }
    ];

    // Sort by streak
    mockLeaders.sort((a, b) => b.current_streak - a.current_streak);
    return mockLeaders as any as T;
  }

  if (endpoint === '/api/leaderboard/rank') {
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    return {
      rank: 4,
      total_users: 150,
      user: currentUser
    } as any as T;
  }

  // --- PROFILE / USER API ---
  if (endpoint === '/api/user/profile' && method === 'GET') {
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      email: 'student@obsidian.edu',
      name: 'Obsidian Scholar',
      bio: 'Lifelong learner exploring AI capabilities.',
      total_xp: 2450,
      current_streak: 7
    });
    return { profile: currentUser } as any as T;
  }

  if (endpoint === '/api/user/profile' && method === 'PUT') {
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      email: 'student@obsidian.edu',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    
    const updated = {
      ...currentUser,
      ...body
    };
    setMockData('current_user', updated);
    return { profile: updated } as any as T;
  }

  if (endpoint === '/api/user/dashboard') {
    const currentUser = getMockData<any>('current_user', {
      id: 'mock-user-id',
      name: 'Obsidian Scholar',
      total_xp: 2450,
      current_streak: 7
    });
    const quizHistory = getMockData<any[]>('quiz_history', []);
    const studySessions = getMockData<any[]>('study_sessions', []);
    
    return {
      xp: currentUser.total_xp,
      streak: currentUser.current_streak,
      level: Math.floor(currentUser.total_xp / 100) || 1,
      stats: {
        quizzes_taken: quizHistory.length,
        average_score: quizHistory.length > 0 ? (quizHistory.reduce((sum, h) => sum + h.percentage, 0) / quizHistory.length) : 0,
        focus_minutes: studySessions.reduce((sum, s) => sum + s.duration_minutes, 0)
      },
      recent_activities: [
        { id: 'act-1', description: 'Started learning on Obsidian', date: new Date().toISOString() }
      ]
    } as any as T;
  }

  throw new Error(`Mock endpoint handler not implemented for ${method} ${endpoint}`);
}

// Auth API
export const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    const response = await apiRequest<{
      user: { id: string; email: string; name: string; is_new_user: boolean; total_xp?: number; current_streak?: number };
      access_token: string;
      refresh_token: string;
    }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest<{
      user: { id: string; email: string; name: string; is_new_user: boolean; total_xp?: number; current_streak?: number };
      access_token: string;
      refresh_token: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.access_token) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  logout: async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn("Logout request failed, cleaning local session anyway", e);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    return apiRequest<{
      user: {
        id: string;
        email: string;
        name: string;
        avatar_url?: string;
        total_xp: number;
        current_streak: number;
      };
    }>('/api/auth/me');
  },
};

// Tutor/Chat API
export const tutorAPI = {
  chat: async (message: string, conversationHistory: any[] = []) => {
    return apiRequest<{
      response: string;
      conversation_history: any[];
    }>('/api/tutor/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_history: conversationHistory }),
    });
  },

  explain: async (topic: string, level: string = 'intermediate') => {
    return apiRequest<{ explanation: string }>('/api/tutor/explain', {
      method: 'POST',
      body: JSON.stringify({ topic, level }),
    });
  },
};

// Quiz API
export const quizAPI = {
  generate: async (topic: string, difficulty: string = 'medium', numQuestions: number = 5) => {
    return apiRequest<{
      id: string;
      title: string;
      topic: string;
      difficulty: string;
      questions: any[];
    }>('/api/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, difficulty, num_questions: numQuestions }),
    });
  },

  getQuiz: async (quizId: string) => {
    return apiRequest(`/api/quiz/${quizId}`);
  },

  submit: async (quizId: string, answers: Record<string, any>, timeTaken: number) => {
    return apiRequest<{
      attempt: any;
      results: any[];
      score: number;
      total: number;
      percentage: number;
      xp: any;
    }>(`/api/quiz/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, time_taken: timeTaken }),
    });
  },

  getHistory: async () => {
    return apiRequest('/api/quiz/history');
  },

  getStats: async () => {
    return apiRequest('/api/quiz/stats');
  },
};

// Notes API
export const notesAPI = {
  generate: async (topic: string, subject?: string, level: string = 'intermediate') => {
    return apiRequest<{
      note: any;
      ai_data: {
        title: string;
        summary: string;
        content: string;
        keyPoints: string[];
        examples: string[];
        formulas: string[];
        relatedTopics: string[];
      };
    }>('/api/notes/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, subject, level }),
    });
  },

  create: async (title: string, content: string, tags: string[] = [], subject?: string) => {
    return apiRequest('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content, tags, subject }),
    });
  },

  getAll: async (subject?: string, tag?: string) => {
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (tag) params.append('tag', tag);
    return apiRequest(`/api/notes?${params.toString()}`);
  },

  getNote: async (noteId: string) => {
    return apiRequest(`/api/notes/${noteId}`);
  },

  update: async (noteId: string, data: { title?: string; content?: string; tags?: string[]; subject?: string }) => {
    return apiRequest(`/api/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (noteId: string) => {
    return apiRequest(`/api/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  search: async (searchTerm: string) => {
    return apiRequest(`/api/notes/search?q=${encodeURIComponent(searchTerm)}`);
  },
};

// Mind Map API
export const mindmapAPI = {
  generate: async (topic: string) => {
    return apiRequest<{
      id: string;
      title: string;
      topics: any[];
      ai_generated: boolean;
    }>('/api/mindmap/generate', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  },

  create: async (title: string, topics: any[] = []) => {
    return apiRequest('/api/mindmap', {
      method: 'POST',
      body: JSON.stringify({ title, topics }),
    });
  },

  getAll: async () => {
    return apiRequest('/api/mindmap');
  },

  getMindmap: async (mindmapId: string) => {
    return apiRequest(`/api/mindmap/${mindmapId}`);
  },

  update: async (mindmapId: string, data: { title?: string; topics?: any[] }) => {
    return apiRequest(`/api/mindmap/${mindmapId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (mindmapId: string) => {
    return apiRequest(`/api/mindmap/${mindmapId}`, {
      method: 'DELETE',
    });
  },
};

// Study Planner API
export const studyAPI = {
  createPlan: async (subject: string, durationWeeks: number, currentLevel: string = 'intermediate') => {
    return apiRequest('/api/study/plan', {
      method: 'POST',
      body: JSON.stringify({ subject, duration_weeks: durationWeeks, current_level: currentLevel }),
    });
  },

  getPlans: async () => {
    return apiRequest('/api/study/plans');
  },

  getPlan: async (planId: string) => {
    return apiRequest(`/api/study/plan/${planId}`);
  },

  updateProgress: async (planId: string, progress: number) => {
    return apiRequest(`/api/study/plan/${planId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress }),
    });
  },

  createSession: async (durationMinutes: number, subject?: string, notes?: string) => {
    return apiRequest('/api/study/session', {
      method: 'POST',
      body: JSON.stringify({ duration_minutes: durationMinutes, subject, notes }),
    });
  },

  getStats: async (days: number = 7) => {
    return apiRequest(`/api/study/stats?days=${days}`);
  },
};

// Leaderboard API
export const leaderboardAPI = {
  getGlobal: async (limit: number = 100, offset: number = 0) => {
    return apiRequest(`/api/leaderboard/global?limit=${limit}&offset=${offset}`);
  },

  getStreak: async (limit: number = 100) => {
    return apiRequest(`/api/leaderboard/streak?limit=${limit}`);
  },

  getUserRank: async () => {
    return apiRequest('/api/leaderboard/rank');
  },
};

// User/Profile API
export const userAPI = {
  getProfile: async () => {
    return apiRequest('/api/user/profile');
  },

  updateProfile: async (data: { name?: string; avatar_url?: string; bio?: string; preferences?: any }) => {
    return apiRequest('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getDashboard: async () => {
    return apiRequest('/api/user/dashboard');
  },
};

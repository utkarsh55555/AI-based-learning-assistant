from config.settings import settings
from typing import List, Dict
import json
import re
import requests
import logging

logger = logging.getLogger(__name__)

# No hardcoded API key fallback — set OPENROUTER_API_KEY in environment variables / .env

def call_gemini_api(messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1500) -> str:
    """Call Google Gemini API via OpenAI-compatible endpoint or native REST API"""
    gemini_key = getattr(settings, "GEMINI_API_KEY", None)
    if not gemini_key or gemini_key == "your_gemini_api_key_here":
        return None

    model = getattr(settings, "GEMINI_MODEL", "models/gemini-1.5-flash")
    clean_model = model.replace("models/", "") if model else "gemini-1.5-flash"

    # Attempt 1: OpenAI-compatible endpoint for Gemini
    try:
        base_url = (getattr(settings, "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")).rstrip('/')
        url = f"{base_url}/openai/chat/completions"
        headers = {
            "Authorization": f"Bearer {gemini_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": clean_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        if res.ok:
            data = res.json()
            if "choices" in data and len(data["choices"]) > 0:
                text = data["choices"][0]["message"]["content"]
                if text:
                    return text.strip()
    except Exception as e:
        logger.debug("Gemini OpenAI-compatible endpoint error: %s", e)

    # Attempt 2: Native Google Generative AI REST API
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={gemini_key}"
        contents = []
        system_instruction = None

        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                system_instruction = {"parts": [{"text": str(content)}]}
            else:
                g_role = "user" if role == "user" else "model"
                contents.append({"role": g_role, "parts": [{"text": str(content)}]})

        body = {"contents": contents}
        if system_instruction:
            body["system_instruction"] = system_instruction
        if temperature:
            body["generationConfig"] = {"temperature": temperature, "maxOutputTokens": max_tokens}

        res = requests.post(url, headers={"Content-Type": "application/json"}, json=body, timeout=30)
        if res.ok:
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
    except Exception as e:
        logger.debug("Gemini native REST endpoint error: %s", e)

    return None


def call_openrouter_api(messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1500) -> str:
    """Call OpenRouter chat completions endpoint"""
    api_key = getattr(settings, "OPENROUTER_API_KEY", None)
    if not api_key:
        logger.warning("OPENROUTER_API_KEY is not set. Skipping OpenRouter.")
        return None

    url = f"{(getattr(settings, 'OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')).rstrip('/')}/chat/completions"
    model = getattr(settings, "OPENROUTER_MODEL", "openai/gpt-4o-mini")
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-based-learning-assistant-xi.vercel.app",
        "X-Title": "Obsidian AI Learning Assistant"
    }

    try:
        logger.debug("OpenRouter request → model=%s url=%s", model, url)
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.ok:
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                text = data["choices"][0]["message"]["content"]
                if text:
                    return text.strip()
            else:
                logger.error("OpenRouter OK but no choices: %s", data)
        else:
            logger.error("OpenRouter HTTP %s: %s", response.status_code, response.text[:500])
    except Exception as e:
        logger.error("OpenRouter API error: %s", e)

    return None


def call_openai_api(messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1500) -> str:
    """Call direct OpenAI API if key provided"""
    api_key = getattr(settings, "OPENAI_API_KEY", None)
    if not api_key:
        return None

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        if response.ok:
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                text = data["choices"][0]["message"]["content"]
                if text:
                    return text.strip()
    except Exception as e:
        logger.debug("OpenAI API error: %s", e)

    return None


def _generate_dynamic_fallback(messages: List[Dict[str, str]]) -> str:
    """Generates context-aware, structured markdown responses when external services are unavailable."""
    user_prompt = messages[-1]["content"] if messages else "General Subject"
    prompt_lower = user_prompt.lower()

    if "quiz" in prompt_lower or "multiple-choice" in prompt_lower:
        topic_match = re.search(r'about ["\']?([^"\']+)["\']?', user_prompt, re.IGNORECASE)
        topic = topic_match.group(1) if topic_match else "General Learning"
        return json.dumps([
            {
                "question": f"What is a fundamental principle of {topic}?",
                "options": [
                    f"Core foundational concept of {topic}",
                    f"Secondary application of {topic}",
                    "Unrelated hypothesis",
                    "Historical milestone"
                ],
                "correct": 0,
                "explanation": f"The core foundational concept forms the essential building block of {topic}.",
                "difficulty": "medium"
            },
            {
                "question": f"Which of the following best describes the practical goal of studying {topic}?",
                "options": [
                    "Restricting knowledge sharing",
                    f"Developing practical problem-solving skills in {topic}",
                    "Memorizing definitions without application",
                    "Ignoring analytical methodology"
                ],
                "correct": 1,
                "explanation": f"Mastering {topic} allows you to apply concepts directly to practical problems.",
                "difficulty": "easy"
            }
        ])

    if "mind map" in prompt_lower or "mindmap" in prompt_lower:
        topic = user_prompt.replace("Create a comprehensive mind map for the topic:", "").replace("Create a mind map for", "").strip() or "General Topic"
        return json.dumps({
            "title": topic,
            "topics": [
                {
                    "id": "t1",
                    "label": "Core Foundations",
                    "color": "#3B82F6",
                    "summary": f"Primary principles and definitions underlying {topic}.",
                    "subtopics": [
                        {"id": "st1-1", "label": "Key Terminology", "summary": "Essential definitions and concepts."},
                        {"id": "st1-2", "label": "Theoretical Framework", "summary": "Foundational rules and guidelines."}
                    ]
                },
                {
                    "id": "t2",
                    "label": "Applications & Practice",
                    "color": "#10B981",
                    "summary": f"How {topic} is implemented in real-world scenarios.",
                    "subtopics": [
                        {"id": "st2-1", "label": "Case Studies", "summary": "Practical examples and experiments."},
                        {"id": "st2-2", "label": "Problem Solving", "summary": "Strategies for resolving complex challenges."}
                    ]
                },
                {
                    "id": "t3",
                    "label": "Advanced Perspectives",
                    "color": "#8B5CF6",
                    "summary": f"Modern developments and specialized areas within {topic}.",
                    "subtopics": [
                        {"id": "st3-1", "label": "Innovations", "summary": "Recent breakthroughs and upcoming trends."},
                        {"id": "st3-2", "label": "Synthesis", "summary": "Combining techniques for optimal results."}
                    ]
                }
            ]
        })

    if "notes" in prompt_lower:
        topic = user_prompt.replace("Generate study notes on:", "").strip() or "Core Subject"
        return json.dumps({
            "title": topic.title(),
            "summary": f"A comprehensive study reference for {topic}, outlining core definitions, applications, and practice methods.",
            "content": f"# Master Reference Guide: {topic.title()}\n\n## 1. Overview & Key Principles\n{topic} is a crucial area of study. Understanding its baseline components provides the framework for advanced mastery.\n\n## 2. Core Methodologies\n- **Step 1**: Deconstruct the problem into foundational elements.\n- **Step 2**: Apply core principles to standard scenarios.\n- **Step 3**: Evaluate outcomes and iterate on solutions.\n\n## 3. Practical Applications\nReal-world applications of {topic} show how theory connects to practice, driving analytical efficiency and conceptual clarity.",
            "keyPoints": [
                f"Master foundational definitions of {topic}.",
                "Use structured visual maps to link related concepts.",
                "Reinforce learning with practice problems and active recall."
            ],
            "examples": [f"Standard implementation example for {topic}."],
            "formulas": ["Mastery = Consistent Active Recall + Problem Solving"],
            "relatedTopics": ["Advanced Concepts", "Analytical Methods", "Study Strategies"]
        })

    return (
        f"### Gemini AI Tutor Guide: {user_prompt.title()}\n\n"
        f"Here is a comprehensive breakdown for **{user_prompt}**:\n\n"
        f"#### 1. Core Principles\n"
        f"The foundation of **{user_prompt}** relies on understanding its core mechanics and structural components. "
        f"Mastering these principles allows you to solve complex questions with confidence.\n\n"
        f"#### 2. Key Applications\n"
        f"- **Analytical Insight**: Break down problems systematically into smaller, manageable parts.\n"
        f"- **Practical Implementation**: Apply standard formulas, definitions, and rules in real-world contexts.\n"
        f"- **Synthesized Practice**: Test your understanding by creating practice flashcards or quizzes.\n\n"
        f"#### 3. Recommended Next Steps\n"
        f"Would you like me to generate a practice quiz, create structured study notes, or construct a visual mind map for **{user_prompt}**? 🚀"
    )


class AITutorService:
    @staticmethod
    def chat_completion(messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1500) -> str:
        """Get chat completion using Gemini, OpenRouter, OpenAI, or dynamic fallback."""
        # 1. Try Gemini API
        res = call_gemini_api(messages, temperature=temperature, max_tokens=max_tokens)
        if res:
            return res

        # 2. Try OpenRouter API
        res = call_openrouter_api(messages, temperature=temperature, max_tokens=max_tokens)
        if res:
            return res

        # 3. Try OpenAI API
        res = call_openai_api(messages, temperature=temperature, max_tokens=max_tokens)
        if res:
            return res

        # 4. Fallback synthesis
        return _generate_dynamic_fallback(messages)

    @staticmethod
    def generate_quiz(topic: str, difficulty: str = "medium", num_questions: int = 5) -> str:
        """Generate quiz questions using AI"""
        prompt = f"""Generate {num_questions} {difficulty} level multiple choice questions about {topic}.

Return a JSON array with this exact format:
[
    {{
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0,
        "explanation": "Detailed explanation of the correct answer",
        "difficulty": "{difficulty}"
    }}
]

Make sure the questions are educational and accurate. Return ONLY valid JSON, no markdown formatting or code blocks."""
        
        messages = [
            {"role": "system", "content": "You are an expert educator creating quiz questions. Always respond with valid JSON only, no markdown formatting, no code blocks."},
            {"role": "user", "content": prompt}
        ]
        
        response = AITutorService.chat_completion(messages, temperature=0.8, max_tokens=2000)
        return AITutorService._clean_json_response(response)
    
    @staticmethod
    def explain_concept(topic: str, level: str = "intermediate") -> str:
        """Get AI explanation of a concept"""
        prompt = f"Explain '{topic}' at a {level} level. Be clear, encouraging, and highly educational with markdown formatting."
        
        messages = [
            {"role": "system", "content": "You are Gemini AI Tutor, an encouraging and clear educator."},
            {"role": "user", "content": prompt}
        ]
        
        return AITutorService.chat_completion(messages)
    
    @staticmethod
    def generate_study_plan(subject: str, duration_weeks: int = 4, current_level: str = "intermediate") -> str:
        """Generate a personalized study plan"""
        prompt = f"""Create a {duration_weeks}-week study plan for learning {subject}. Current level: {current_level}.

Format as a JSON object with this structure:
{{
    "title": "{subject.title()} Study Plan",
    "duration_weeks": {duration_weeks},
    "weeks": [
        {{
            "week": 1,
            "title": "Week 1: Core Foundations",
            "topics": ["Topic 1", "Topic 2"],
            "goals": ["Goal 1", "Goal 2"],
            "resources": ["Resource 1"]
        }}
    ]
}}
Return ONLY valid JSON."""
        
        messages = [
            {"role": "system", "content": "You are an expert educational planner. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = AITutorService.chat_completion(messages, temperature=0.7)
        return AITutorService._clean_json_response(response)
    
    @staticmethod
    def generate_mindmap(topic: str) -> str:
        """Generate mind map structure using AI"""
        prompt = f"""Create a comprehensive mind map for the topic: {topic}

Return a JSON object with this structure:
{{
    "title": "{topic}",
    "topics": [
        {{
            "id": "unique-id-1",
            "label": "Topic Name",
            "color": "#3B82F6",
            "summary": "Detailed summary of this topic",
            "subtopics": [
                {{
                    "id": "sub-id-1",
                    "label": "Subtopic Name",
                    "summary": "Detailed summary"
                }}
            ]
        }}
    ]
}}

Include 3-5 main topics, each with 2-4 subtopics. Make summaries educational and comprehensive. 
CRITICAL: Use a DIFFERENT vibrant, beautiful hex color (e.g., "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4") for EACH main topic's "color" field so the mind map is visually stunning."""
        
        messages = [
            {"role": "system", "content": "You are an expert educator creating mind maps. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = AITutorService.chat_completion(messages, temperature=0.8, max_tokens=2000)
        return AITutorService._clean_json_response(response)
    
    @staticmethod
    def generate_notes(topic: str, subject: str = None, level: str = "intermediate") -> str:
        """Generate comprehensive study notes using AI"""
        subject_text = f" for {subject}" if subject else ""
        prompt = f"""Generate comprehensive, detailed study notes on the topic: {topic}{subject_text} at a {level} level.

Return a JSON object with this exact structure:
{{
    "title": "{topic.title()}",
    "summary": "Brief summary (2-3 sentences)",
    "content": "A detailed multi-paragraph explanation covering all major aspects, definitions, core theories, and applications.",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
    "examples": ["Detailed example 1", "Detailed example 2"],
    "formulas": ["Formula or core equation 1"],
    "relatedTopics": ["Related topic 1", "Related topic 2"]
}}

Make the notes educational, clear, and comprehensive. Return ONLY valid JSON."""
        
        messages = [
            {"role": "system", "content": "You are an expert educator creating comprehensive study notes. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = AITutorService.chat_completion(messages, temperature=0.7, max_tokens=2000)
        return AITutorService._clean_json_response(response)
    
    @staticmethod
    def generate_flashcards(topic: str, count: int = 5) -> str:
        """Generate flashcards using AI"""
        prompt = f"""Generate {count} educational flashcards on the topic: {topic}.

Return a JSON array with this exact structure:
[
    {{
        "front": "Question or prompt on front of card?",
        "back": "Detailed answer and explanation on back of card.",
        "subject": "{topic}"
    }}
]

Return ONLY valid JSON, no markdown formatting."""
        
        messages = [
            {"role": "system", "content": "You are an expert learning assistant generating flashcards. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = AITutorService.chat_completion(messages, temperature=0.7, max_tokens=1500)
        return AITutorService._clean_json_response(response)

    @staticmethod
    def _clean_json_response(response: str) -> str:
        """Helper method to clean JSON responses from markdown formatting"""
        cleaned = response.strip()
        
        # Remove ```json and ``` fences if present
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
        
        # Try to find the JSON block using start/end characters
        start_idx = -1
        end_idx = -1
        
        for i, char in enumerate(cleaned):
            if char in ['{', '[']:
                start_idx = i
                break
                
        for i in range(len(cleaned) - 1, -1, -1):
            if cleaned[i] in ['}', ']']:
                end_idx = i
                break
                
        if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
            return cleaned[start_idx:end_idx + 1]
            
        return cleaned

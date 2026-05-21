from config.settings import settings
from typing import List, Dict
import json
import requests


def _call_openrouter_chat_completions(messages: List[Dict[str, str]], temperature: float, max_tokens: int) -> str:
    """Call OpenRouter chat completions endpoint using HTTP API"""
    if not settings.OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not set. Please set it in src/obsidian-backend-flask/.env")

    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
    except Exception as e:
        raise Exception(f"Error calling OpenRouter API: {str(e)}")

    if not response.ok:
        raise Exception(f"OpenRouter API error: {response.status_code} {response.text}")

    data = response.json()
    try:
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        raise Exception(f"Unexpected OpenRouter API response format: {e} - raw: {data}")


class AITutorService:
    @staticmethod
    def chat_completion(messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 1000):
        """Get chat completion from OpenRouter"""
        return _call_openrouter_chat_completions(messages, temperature=temperature, max_tokens=max_tokens)

    @staticmethod
    def generate_quiz(topic: str, difficulty: str, num_questions: int = 5):
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
            {"role": "system", "content": "You are an expert educator creating quiz questions. Always respond with valid JSON only, no markdown, no code blocks, just pure JSON."},
            {"role": "user", "content": prompt}
        ]
        
        response = AITutorService.chat_completion(messages, temperature=0.8, max_tokens=2000)
        
        # Clean response - remove markdown code blocks if present
        cleaned_response = response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        return cleaned_response
    
    @staticmethod
    def explain_concept(topic: str, level: str = "intermediate"):
        """Get AI explanation of a concept"""
        prompt = f"Explain {topic} at a {level} level. Be clear, concise, and educational."
        
        messages = [
            {"role": "system", "content": "You are a helpful AI tutor who explains concepts clearly."},
            {"role": "user", "content": prompt}
        ]
        
        return AITutorService.chat_completion(messages)
    
    @staticmethod
    def generate_study_plan(subject: str, duration_weeks: int, current_level: str):
        """Generate a personalized study plan"""
        prompt = f"""Create a {duration_weeks}-week study plan for learning {subject}.
        Current level: {current_level}
        
        Format as a JSON object with this structure:
        {{
            "title": "Study plan title",
            "duration_weeks": {duration_weeks},
            "weeks": [
                {{
                    "week": 1,
                    "topics": ["Topic 1", "Topic 2"],
                    "goals": ["Goal 1", "Goal 2"],
                    "resources": ["Resource 1"]
                }}
            ]
        }}"""
        
        messages = [
            {"role": "system", "content": "You are an expert educational planner. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        return AITutorService.chat_completion(messages, temperature=0.7)
    
    @staticmethod
    def generate_mindmap(topic: str):
        """Generate mind map structure using AI"""
        prompt = f"""Create a comprehensive mind map for the topic: {topic}
        
        Return a JSON object with this structure:
        {{
            "title": "{topic}",
            "topics": [
                {{
                    "id": "unique-id",
                    "label": "Topic Name",
                    "color": "#3B82F6",
                    "summary": "Detailed summary of this topic",
                    "subtopics": [
                        {{
                            "id": "sub-unique-id",
                            "label": "Subtopic Name",
                            "summary": "Detailed summary"
                        }}
                    ]
                }}
            ]
        }}
        
        Include 3-5 main topics, each with 2-4 subtopics. Make summaries educational and comprehensive."""
        
        messages = [
            {"role": "system", "content": "You are an expert educator creating mind maps. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        return AITutorService.chat_completion(messages, temperature=0.8, max_tokens=2000)
    
    @staticmethod
    def generate_notes(topic: str, subject: str = None, level: str = "intermediate"):
        """Generate comprehensive study notes using AI"""
        subject_text = f" for {subject}" if subject else ""
        prompt = f"""Generate comprehensive study notes on the topic: {topic}{subject_text}
        
        Current level: {level}
        
        Return a JSON object with this exact structure:
        {{
            "title": "Topic Title",
            "summary": "Brief summary (2-3 sentences)",
            "content": "Detailed content explaining the topic thoroughly",
            "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
            "examples": ["Example 1", "Example 2"],
            "formulas": ["Formula 1", "Formula 2"] (if applicable, otherwise empty array),
            "relatedTopics": ["Related topic 1", "Related topic 2"]
        }}
        
        Make the notes educational, clear, and comprehensive. Ensure the JSON is valid."""
        
        messages = [
            {"role": "system", "content": "You are an expert educator creating comprehensive study notes. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = AITutorService.chat_completion(messages, temperature=0.7, max_tokens=2000)
        
        # Clean response - remove markdown code blocks if present
        cleaned_response = response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        return cleaned_response
    
    @staticmethod
    def _clean_json_response(response: str) -> str:
        """Helper method to clean JSON responses from markdown formatting"""
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return cleaned.strip()

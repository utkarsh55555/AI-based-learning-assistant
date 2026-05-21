from services.supabase_service import SupabaseService
from services.ai_tutor_service import AITutorService
from services.xp_service import XPService
import json

class QuizController:
    @staticmethod
    def generate_quiz(topic: str, difficulty: str, num_questions: int = 5, user_id: str = None):
        """Generate a quiz using AI"""
        try:
            quiz_json = AITutorService.generate_quiz(topic, difficulty, num_questions)
            # Try to parse JSON, handle potential errors
            try:
                questions = json.loads(quiz_json)
            except json.JSONDecodeError as e:
                # If JSON parsing fails, try to extract JSON from the response
                import re
                json_match = re.search(r'\[.*\]', quiz_json, re.DOTALL)
                if json_match:
                    questions = json.loads(json_match.group())
                else:
                    raise Exception(f"Failed to parse quiz JSON: {str(e)}")
            
            # Save quiz to database (optional; ignore errors if table doesn't exist)
            quiz_data = {
                "title": f"{topic} - {difficulty.capitalize()} Quiz",
                "topic": topic,
                "difficulty": difficulty,
                "questions": questions,
                "created_by": user_id
            }
            
            try:
                quiz = SupabaseService.create_record("quizzes", quiz_data)
            except Exception as e:
                # Log the error but don't fail the response
                print(f"[WARNING] Failed to save quiz: {e}")
                quiz = {"id": "temp-quiz-id", **quiz_data}
            
            return quiz
        except Exception as e:
            raise Exception(f"Quiz generation error: {str(e)}")
    
    @staticmethod
    def get_quiz(quiz_id: str):
        """Get quiz by ID"""
        return SupabaseService.get_record("quizzes", quiz_id)
    
    @staticmethod
    def get_user_quizzes(user_id: str, limit: int = 10):
        """Get user's quiz history"""
        try:
            return SupabaseService.query_records(
                "quiz_attempts",
                lambda q: q.select("*, quizzes(*)").eq("user_id", user_id).order("created_at", desc=True).limit(limit)
            )
        except Exception as e:
            print(f"[WARNING] Failed to fetch user quizzes: {e}")
            return []
    
    @staticmethod
    def submit_quiz(user_id: str, quiz_id: str, answers: dict, time_taken: int):
        """Submit quiz answers"""
        quiz = QuizController.get_quiz(quiz_id)
        
        if not quiz:
            raise Exception("Quiz not found")
        
        questions = quiz.get("questions", [])
        score = 0
        total = len(questions)
        results = []
        
        # Grade quiz
        for i, question in enumerate(questions):
            user_answer = answers.get(str(i))
            correct_answer = question.get("correct")
            is_correct = user_answer == correct_answer
            
            if is_correct:
                score += 1
            
            results.append({
                "question_index": i,
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": question.get("explanation", "")
            })
        
        percentage = (score / total * 100) if total > 0 else 0
        
        # Calculate XP
        difficulty_multiplier = {"easy": 1.0, "medium": 1.5, "hard": 2.0}.get(quiz.get("difficulty", "medium"), 1.0)
        xp_result = XPService.award_xp(user_id, "quiz_completion", difficulty_multiplier)
        
        # Save attempt (optional; ignore errors if table doesn't exist)
        attempt_data = {
            "user_id": user_id,
            "quiz_id": quiz_id,
            "score": score,
            "total_questions": total,
            "percentage": percentage,
            "time_taken_seconds": time_taken,
            "answers": answers,
            "results": results,
            "xp_earned": xp_result.get("xp_earned", 0)
        }
        
        try:
            attempt = SupabaseService.create_record("quiz_attempts", attempt_data)
        except Exception as e:
            # Log the error but don't fail the response
            print(f"[WARNING] Failed to save quiz attempt: {e}")
            attempt = {"id": "temp-attempt-id", **attempt_data}
        
        return {
            "attempt": attempt,
            "results": results,
            "score": score,
            "total": total,
            "percentage": percentage,
            "xp": xp_result
        }
    
    @staticmethod
    def get_quiz_stats(user_id: str):
        """Get user's quiz statistics"""
        try:
            attempts = SupabaseService.get_records("quiz_attempts", {"user_id": user_id})
        except Exception as e:
            print(f"[WARNING] Failed to fetch quiz stats: {e}")
            attempts = []
        
        if not attempts:
            return {
                "total_quizzes": 0,
                "average_score": 0,
                "total_xp": 0,
                "best_score": 0
            }
        
        total_quizzes = len(attempts)
        average_score = sum(a.get("percentage", 0) for a in attempts) / total_quizzes
        total_xp = sum(a.get("xp_earned", 0) for a in attempts)
        best_score = max(a.get("percentage", 0) for a in attempts)
        
        return {
            "total_quizzes": total_quizzes,
            "average_score": average_score,
            "total_xp": total_xp,
            "best_score": best_score
        }

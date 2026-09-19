from services.mongo_service import MongoService
from services.ai_tutor_service import AITutorService
from services.xp_service import XPService
import json

class StudyController:
    @staticmethod
    def create_study_plan(user_id: str, subject: str, duration_weeks: int, current_level: str = "intermediate"):
        """Create a study plan"""
        try:
            plan_json = AITutorService.generate_study_plan(subject, duration_weeks, current_level)
            plan_data = json.loads(plan_json)
            
            db_data = {
                "user_id": user_id,
                "subject": subject,
                "duration_weeks": duration_weeks,
                "current_level": current_level,
                "plan": plan_data,
                "progress": 0
            }
            
            study_plan = MongoService.create_record("study_plans", db_data)
            return study_plan
        except Exception as e:
            raise Exception(f"Study plan creation error: {str(e)}")
    
    @staticmethod
    def get_study_plan(plan_id: str):
        """Get study plan by ID"""
        return MongoService.get_record("study_plans", plan_id, id_column="_id")
    
    @staticmethod
    def get_user_study_plans(user_id: str):
        """Get user's study plans"""
        return MongoService.get_records("study_plans", filters={"user_id": user_id}, order_by="-created_at")
    
    @staticmethod
    def update_study_plan_progress(plan_id: str, user_id: str, progress: float):
        """Update study plan progress"""
        plan = MongoService.get_record("study_plans", plan_id, id_column="_id")
        if not plan or plan.get("user_id") != user_id:
            raise Exception("Unauthorized or plan not found")
        
        return MongoService.update_record("study_plans", plan_id, {"progress": progress}, id_column="_id")
    
    @staticmethod
    def create_study_session(user_id: str, duration_minutes: int, subject: str = None, notes: str = None):
        """Record a study session"""
        session_data = {
            "user_id": user_id,
            "duration_minutes": duration_minutes,
            "subject": subject,
            "notes": notes
        }
        
        session = MongoService.create_record("study_sessions", session_data)
        
        # Award XP
        XPService.award_xp(user_id, "study_session", multiplier=duration_minutes / 25)
        
        return session
    
    @staticmethod
    def get_study_stats(user_id: str, days: int = 7):
        """Get study statistics"""
        sessions = MongoService.get_records(
            "study_sessions",
            filters={"user_id": user_id},
            order_by="-created_at",
            limit=days * 5
        )
        
        total_time = sum(s.get("duration_minutes", 0) for s in sessions)
        total_sessions = len(sessions)
        avg_session_time = total_time / total_sessions if total_sessions > 0 else 0
        
        return {
            "total_sessions": total_sessions,
            "total_time_minutes": total_time,
            "average_session_minutes": avg_session_time,
            "recent_sessions": sessions[:10]
        }

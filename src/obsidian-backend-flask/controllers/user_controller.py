from services.supabase_service import SupabaseService
from services.xp_service import XPService
from services.streak_service import StreakService

class UserController:
    @staticmethod
    def get_profile(user_id: str):
        """Get user profile"""
        profile = SupabaseService.get_record("user_profiles", user_id, "user_id")
        
        if profile:
            # Add calculated fields
            profile["level_info"] = XPService.get_xp_for_next_level(profile.get("total_xp", 0))
            profile["streak_info"] = StreakService.get_streak_info(user_id)
        
        return profile
    
    @staticmethod
    def update_profile(user_id: str, data: dict):
        """Update user profile"""
        allowed_fields = ["name", "avatar_url", "bio", "preferences"]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        return SupabaseService.update_record("user_profiles", user_id, update_data, "user_id")
    
    @staticmethod
    def get_dashboard_stats(user_id: str):
        """Get dashboard statistics"""
        profile = UserController.get_profile(user_id)
        
        # Get activity stats
        quiz_stats = SupabaseService.query_records(
            "quiz_attempts",
            lambda q: q.select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10)
        )
        
        study_sessions = SupabaseService.query_records(
            "study_sessions",
            lambda q: q.select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10)
        )
        
        return {
            "profile": profile,
            "recent_quizzes": quiz_stats,
            "recent_sessions": study_sessions,
            "total_quizzes": len(quiz_stats),
            "total_study_time": sum(s.get("duration_minutes", 0) for s in study_sessions)
        }
    
    @staticmethod
    def record_activity(user_id: str, activity_type: str, details: dict = None):
        """Record user activity"""
        # Update streak
        streak_result = StreakService.update_streak(user_id)
        
        # Award XP for activity
        xp_result = XPService.award_xp(user_id, activity_type)
        
        # Log activity
        activity_data = {
            "user_id": user_id,
            "activity_type": activity_type,
            "details": details or {},
            "xp_earned": xp_result.get("xp_earned", 0)
        }
        
        SupabaseService.create_record("user_activities", activity_data)
        
        return {
            "streak": streak_result,
            "xp": xp_result
        }

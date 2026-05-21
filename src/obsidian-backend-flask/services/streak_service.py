from supabase_client import supabase
from datetime import datetime, timedelta

class StreakService:
    @staticmethod
    def update_streak(user_id: str) -> dict:
        """Update user's study streak"""
        result = supabase.table("user_profiles").select("last_activity_date, current_streak").eq("user_id", user_id).single().execute()
        
        if not result.data:
            return {"current_streak": 0, "streak_updated": False}
        
        last_activity = result.data.get("last_activity_date")
        current_streak = result.data.get("current_streak", 0)
        
        today = datetime.utcnow().date()
        
        # First activity
        if not last_activity:
            new_streak = 1
            streak_updated = True
        else:
            last_date = datetime.fromisoformat(last_activity).date()
            days_diff = (today - last_date).days
            
            if days_diff == 0:
                # Same day, no change
                new_streak = current_streak
                streak_updated = False
            elif days_diff == 1:
                # Consecutive day, increment
                new_streak = current_streak + 1
                streak_updated = True
            else:
                # Streak broken
                new_streak = 1
                streak_updated = True
        
        # Update database
        supabase.table("user_profiles").update({
            "current_streak": new_streak,
            "last_activity_date": today.isoformat()
        }).eq("user_id", user_id).execute()
        
        return {
            "current_streak": new_streak,
            "streak_updated": streak_updated,
            "streak_broken": streak_updated and new_streak == 1 and current_streak > 1
        }
    
    @staticmethod
    def get_streak_info(user_id: str) -> dict:
        """Get user's streak information"""
        result = supabase.table("user_profiles").select(
            "current_streak, longest_streak, last_activity_date"
        ).eq("user_id", user_id).single().execute()
        
        if not result.data:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "at_risk": False
            }
        
        current_streak = result.data.get("current_streak", 0)
        longest_streak = result.data.get("longest_streak", 0)
        last_activity = result.data.get("last_activity_date")
        
        # Check if streak is at risk (no activity today)
        at_risk = False
        if last_activity:
            last_date = datetime.fromisoformat(last_activity).date()
            today = datetime.utcnow().date()
            at_risk = (today - last_date).days >= 1
        
        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "at_risk": at_risk
        }

from services.mongo_service import MongoService
from datetime import datetime, timedelta

class StreakService:
    @staticmethod
    def update_streak(user_id: str) -> dict:
        """Update user's study streak"""
        records = MongoService.get_records("user_profiles", filters={"user_id": user_id}, limit=1)
        
        if not records:
            return {"current_streak": 0, "streak_updated": False}
        
        profile = records[0]
        last_activity = profile.get("last_activity_date")
        current_streak = profile.get("current_streak", 0)
        
        today = datetime.utcnow().date()
        
        if not last_activity:
            new_streak = 1
            streak_updated = True
        else:
            last_date = datetime.fromisoformat(last_activity).date()
            days_diff = (today - last_date).days
            
            if days_diff == 0:
                new_streak = current_streak
                streak_updated = False
            elif days_diff == 1:
                new_streak = current_streak + 1
                streak_updated = True
            else:
                new_streak = 1
                streak_updated = True
        
        # Update MongoDB
        MongoService.update_record("user_profiles", user_id, {
            "current_streak": new_streak,
            "last_activity_date": today.isoformat()
        }, id_column="user_id")
        
        return {
            "current_streak": new_streak,
            "streak_updated": streak_updated,
            "streak_broken": streak_updated and new_streak == 1 and current_streak > 1
        }
    
    @staticmethod
    def get_streak_info(user_id: str) -> dict:
        """Get user's streak information"""
        records = MongoService.get_records("user_profiles", filters={"user_id": user_id}, limit=1)
        
        if not records:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "at_risk": False
            }
        
        profile = records[0]
        current_streak = profile.get("current_streak", 0)
        longest_streak = profile.get("longest_streak", 0)
        last_activity = profile.get("last_activity_date")
        
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

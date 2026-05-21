from supabase_client import supabase

class XPService:
    # XP rewards
    XP_REWARDS = {
        "quiz_easy": 10,
        "quiz_medium": 20,
        "quiz_hard": 30,
        "quiz_completion": 50,
        "study_session": 25,
        "streak_bonus": 15,
        "achievement": 100,
        "daily_login": 5,
        "note_created": 10,
        "mindmap_created": 20,
    }
    
    # Level thresholds
    LEVEL_THRESHOLDS = [
        0, 100, 250, 500, 1000, 1500, 2500, 4000, 6000, 8500,
        11500, 15000, 19000, 24000, 30000, 37000, 45000, 54000, 64000, 75000
    ]
    
    @staticmethod
    def calculate_level(total_xp: int) -> int:
        """Calculate level from total XP"""
        level = 0
        for threshold in XPService.LEVEL_THRESHOLDS:
            if total_xp >= threshold:
                level += 1
            else:
                break
        return level
    
    @staticmethod
    def get_xp_for_next_level(current_xp: int) -> dict:
        """Get XP needed for next level"""
        current_level = XPService.calculate_level(current_xp)
        
        if current_level >= len(XPService.LEVEL_THRESHOLDS):
            return {
                "current_level": current_level,
                "current_xp": current_xp,
                "next_level_xp": current_xp,
                "xp_needed": 0,
                "progress_percent": 100
            }
        
        current_threshold = XPService.LEVEL_THRESHOLDS[current_level - 1] if current_level > 0 else 0
        next_threshold = XPService.LEVEL_THRESHOLDS[current_level]
        
        xp_in_level = current_xp - current_threshold
        xp_for_level = next_threshold - current_threshold
        progress_percent = (xp_in_level / xp_for_level) * 100 if xp_for_level > 0 else 0
        
        return {
            "current_level": current_level,
            "current_xp": current_xp,
            "next_level_xp": next_threshold,
            "xp_needed": next_threshold - current_xp,
            "progress_percent": progress_percent
        }
    
    @staticmethod
    def award_xp(user_id: str, xp_type: str, multiplier: float = 1.0) -> dict:
        """Award XP to user"""
        base_xp = XPService.XP_REWARDS.get(xp_type, 0)
        xp_earned = int(base_xp * multiplier)
        
        # Get current user XP
        result = supabase.table("user_profiles").select("total_xp").eq("user_id", user_id).single().execute()
        
        if result.data:
            current_xp = result.data.get("total_xp", 0)
            new_xp = current_xp + xp_earned
            
            # Update user XP
            supabase.table("user_profiles").update({
                "total_xp": new_xp
            }).eq("user_id", user_id).execute()
            
            # Check for level up
            old_level = XPService.calculate_level(current_xp)
            new_level = XPService.calculate_level(new_xp)
            level_up = new_level > old_level
            
            return {
                "xp_earned": xp_earned,
                "total_xp": new_xp,
                "level": new_level,
                "level_up": level_up
            }
        
        return {"xp_earned": 0, "total_xp": 0, "level": 0, "level_up": False}

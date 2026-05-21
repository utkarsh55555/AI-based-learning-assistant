from services.supabase_service import SupabaseService

class LeaderboardController:
    @staticmethod
    def get_global_leaderboard(limit: int = 100, offset: int = 0):
        """Get global leaderboard by XP"""
        return SupabaseService.query_records(
            "user_profiles",
            lambda q: q.select("user_id, name, total_xp, avatar_url").order("total_xp", desc=True).range(offset, offset + limit - 1)
        )
    
    @staticmethod
    def get_streak_leaderboard(limit: int = 100):
        """Get leaderboard by current streak"""
        return SupabaseService.query_records(
            "user_profiles",
            lambda q: q.select("user_id, name, current_streak, avatar_url").order("current_streak", desc=True).limit(limit)
        )
    
    @staticmethod
    def get_user_rank(user_id: str):
        """Get user's rank on leaderboard"""
        # This is a simplified version - in production, you'd want a more efficient query
        all_users = SupabaseService.query_records(
            "user_profiles",
            lambda q: q.select("user_id, total_xp").order("total_xp", desc=True)
        )
        
        for index, user in enumerate(all_users, 1):
            if user.get("user_id") == user_id:
                return {
                    "rank": index,
                    "total_users": len(all_users),
                    "percentile": (1 - (index / len(all_users))) * 100 if len(all_users) > 0 else 0
                }
        
        return {"rank": None, "total_users": len(all_users), "percentile": 0}
    
    @staticmethod
    def get_subject_leaderboard(subject: str, limit: int = 50):
        """Get leaderboard for a specific subject based on quiz performance"""
        return SupabaseService.query_records(
            "quiz_attempts",
            lambda q: q.select("user_id, user_profiles(name, avatar_url), avg(percentage)").eq("quizzes.topic", subject).group_by("user_id").order("avg", desc=True).limit(limit)
        )

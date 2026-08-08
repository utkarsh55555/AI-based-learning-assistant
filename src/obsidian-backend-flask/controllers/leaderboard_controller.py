from services.mongo_service import MongoService

class LeaderboardController:
    @staticmethod
    def get_global_leaderboard(limit: int = 100, offset: int = 0):
        """Get global leaderboard by XP"""
        all_users = MongoService.get_records(
            "user_profiles",
            order_by="-total_xp",
            limit=limit + offset
        )
        # Apply offset manually since pymongo cursor offset is handled via skip
        return all_users[offset:offset + limit]
    
    @staticmethod
    def get_streak_leaderboard(limit: int = 100):
        """Get leaderboard by current streak"""
        return MongoService.get_records(
            "user_profiles",
            order_by="-current_streak",
            limit=limit
        )
    
    @staticmethod
    def get_user_rank(user_id: str):
        """Get user's rank on leaderboard"""
        all_users = MongoService.get_records("user_profiles", order_by="-total_xp")
        
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
        # Fetch all attempts for the given topic and compute averages in Python
        attempts = MongoService.get_records("quiz_attempts", filters={"topic": subject})
        
        # Aggregate by user_id
        user_scores = {}
        for attempt in attempts:
            uid = attempt.get("user_id")
            pct = attempt.get("percentage", 0)
            if uid not in user_scores:
                user_scores[uid] = {"total": 0, "count": 0}
            user_scores[uid]["total"] += pct
            user_scores[uid]["count"] += 1
        
        leaderboard = [
            {"user_id": uid, "average_score": data["total"] / data["count"]}
            for uid, data in user_scores.items()
        ]
        leaderboard.sort(key=lambda x: x["average_score"], reverse=True)
        return leaderboard[:limit]

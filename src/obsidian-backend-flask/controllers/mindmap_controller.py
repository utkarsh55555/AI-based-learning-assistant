from services.mongo_service import MongoService
from services.ai_tutor_service import AITutorService
from services.xp_service import XPService
import json

class MindMapController:
    @staticmethod
    def create_mindmap(user_id: str, title: str, topics: list = None):
        """Create a new mind map"""
        mindmap_data = {
            "user_id": user_id,
            "title": title,
            "topics": topics or []
        }
        
        mindmap = MongoService.create_record("mindmaps", mindmap_data)
        
        # Award XP
        XPService.award_xp(user_id, "mindmap_created")
        
        return mindmap
    
    @staticmethod
    def generate_ai_mindmap(user_id: str, topic: str):
        """Generate mind map using AI"""
        try:
            mindmap_json = AITutorService.generate_mindmap(topic)
            try:
                mindmap_data = json.loads(mindmap_json)
            except json.JSONDecodeError as je:
                print(f"FAILED TO PARSE JSON. RAW RESPONSE WAS: {mindmap_json}")
                raise je
            
            db_data = {
                "user_id": user_id,
                "title": mindmap_data.get("title", topic),
                "topics": mindmap_data.get("topics", []),
                "ai_generated": True
            }
            
            try:
                mindmap = MongoService.create_record("mindmaps", db_data)
            except Exception as e:
                print(f"[WARNING] Failed to save AI-generated mindmap: {e}")
                mindmap = {"id": "temp-mindmap-id", **db_data}
            
            # Award XP
            XPService.award_xp(user_id, "mindmap_created")
            
            return mindmap
        except Exception as e:
            raise Exception(f"Mind map generation error: {str(e)}")
    
    @staticmethod
    def get_mindmap(mindmap_id: str):
        """Get mind map by ID"""
        return MongoService.get_record("mindmaps", mindmap_id, id_column="_id")
    
    @staticmethod
    def get_user_mindmaps(user_id: str):
        """Get user's mind maps"""
        return MongoService.get_records("mindmaps", filters={"user_id": user_id}, order_by="-created_at")
    
    @staticmethod
    def update_mindmap(mindmap_id: str, user_id: str, data: dict):
        """Update mind map"""
        mindmap = MongoService.get_record("mindmaps", mindmap_id, id_column="_id")
        if not mindmap or mindmap.get("user_id") != user_id:
            raise Exception("Unauthorized or mind map not found")
        
        allowed_fields = ["title", "topics"]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        return MongoService.update_record("mindmaps", mindmap_id, update_data, id_column="_id")
    
    @staticmethod
    def delete_mindmap(mindmap_id: str, user_id: str):
        """Delete mind map"""
        mindmap = MongoService.get_record("mindmaps", mindmap_id, id_column="_id")
        if not mindmap or mindmap.get("user_id") != user_id:
            raise Exception("Unauthorized or mind map not found")
        
        return MongoService.delete_record("mindmaps", mindmap_id, id_column="_id")

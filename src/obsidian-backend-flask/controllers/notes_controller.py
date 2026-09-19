from services.mongo_service import MongoService
from services.xp_service import XPService
from services.ai_tutor_service import AITutorService
import json
import re

class NotesController:
    @staticmethod
    def create_note(user_id: str, title: str, content: str, tags: list = None, subject: str = None):
        """Create a new note"""
        note_data = {
            "user_id": user_id,
            "title": title,
            "content": content,
            "tags": tags or [],
            "subject": subject
        }
        
        try:
            note = MongoService.create_record("notes", note_data)
        except Exception as e:
            print(f"[WARNING] Failed to save note: {e}")
            note = {"id": "temp-id"}
        
        try:
            XPService.award_xp(user_id, "note_created")
        except Exception as e:
            print(f"[WARNING] Failed to award XP for note creation: {e}")
        
        return note
    
    @staticmethod
    def get_note(note_id: str):
        """Get note by ID"""
        try:
            return MongoService.get_record("notes", note_id, id_column="_id")
        except Exception as e:
            print(f"[WARNING] Failed to fetch note: {e}")
            return None
    
    @staticmethod
    def get_user_notes(user_id: str, subject: str = None, tag: str = None):
        """Get user's notes with optional filters"""
        filters = {"user_id": user_id}
        if subject:
            filters["subject"] = subject
        if tag:
            filters["tags"] = {"$in": [tag]}
            
        try:
            return MongoService.get_records("notes", filters, order_by="-updated_at")
        except Exception as e:
            print(f"[WARNING] Failed to fetch user notes: {e}")
            return []
    
    @staticmethod
    def update_note(note_id: str, user_id: str, data: dict):
        """Update note"""
        try:
            note = MongoService.get_record("notes", note_id, id_column="_id")
            if not note or note.get("user_id") != user_id:
                raise Exception("Unauthorized or note not found")
            
            allowed_fields = ["title", "content", "tags", "subject"]
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            return MongoService.update_record("notes", note_id, update_data, id_column="_id")
        except Exception as e:
            print(f"[WARNING] Failed to update note: {e}")
            raise Exception(f"Update failed: {str(e)}")
    
    @staticmethod
    def delete_note(note_id: str, user_id: str):
        """Delete note"""
        try:
            note = MongoService.get_record("notes", note_id, id_column="_id")
            if not note or note.get("user_id") != user_id:
                raise Exception("Unauthorized or note not found")
            
            return MongoService.delete_record("notes", note_id, id_column="_id")
        except Exception as e:
            print(f"[WARNING] Failed to delete note: {e}")
            raise Exception(f"Delete failed: {str(e)}")
    
    @staticmethod
    def search_notes(user_id: str, search_term: str):
        """Search user's notes"""
        try:
            # Using regex for case-insensitive search
            regex = re.compile(f".*{re.escape(search_term)}.*", re.IGNORECASE)
            filters = {
                "user_id": user_id,
                "$or": [
                    {"title": regex},
                    {"content": regex}
                ]
            }
            return MongoService.get_records("notes", filters, order_by="-updated_at")
        except Exception as e:
            print(f"[WARNING] Failed to search notes: {e}")
            return []
    
    @staticmethod
    def generate_ai_notes(user_id: str, topic: str, subject: str = None, level: str = "intermediate"):
        """Generate notes using AI"""
        try:
            notes_json = AITutorService.generate_notes(topic, subject, level)
            notes_data = json.loads(notes_json)
            
            note_data = {
                "user_id": user_id,
                "title": notes_data.get("title", topic),
                "content": notes_data.get("content", ""),
                "tags": notes_data.get("relatedTopics", []),
                "subject": subject
            }
            
            try:
                note = MongoService.create_record("notes", note_data)
            except Exception as e:
                print(f"[WARNING] Failed to save AI-generated note: {e}")
                note = {"id": "temp-note-id", **note_data}
            
            try:
                XPService.award_xp(user_id, "note_created")
            except Exception as e:
                print(f"[WARNING] Failed to award XP for AI note creation: {e}")
            
            return {
                "note": note,
                "ai_data": notes_data
            }
        except Exception as e:
            raise Exception(f"Notes generation error: {str(e)}")

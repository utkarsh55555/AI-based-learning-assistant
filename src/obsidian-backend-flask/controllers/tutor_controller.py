from services.ai_tutor_service import AITutorService
from services.supabase_service import SupabaseService

class TutorController:
    @staticmethod
    def chat(user_id: str, message: str, conversation_history: list = None):
        """Chat with AI tutor"""
        if conversation_history is None:
            conversation_history = []
        
        # Build messages for OpenAI
        messages = [
            {
                "role": "system",
                "content": "You are Obsidian, an expert AI learning companion. You help students learn by providing clear explanations, answering questions, and offering study guidance. Be encouraging, patient, and educational."
            }
        ]
        
        # Add conversation history
        messages.extend(conversation_history)
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        # Get AI response
        response = AITutorService.chat_completion(messages)
        
        # Save conversation to database (optional; ignore errors if table doesn't exist)
        try:
            conversation_data = {
                "user_id": user_id,
                "messages": messages + [{"role": "assistant", "content": response}]
            }
            SupabaseService.create_record("chat_conversations", conversation_data)
        except Exception as e:
            # Log the error but don't fail the chat response
            print(f"[WARNING] Failed to save chat_conversation: {e}")
        
        return {
            "response": response,
            "conversation_history": messages + [{"role": "assistant", "content": response}]
        }
    
    @staticmethod
    def explain_concept(topic: str, level: str = "intermediate"):
        """Get explanation of a concept"""
        explanation = AITutorService.explain_concept(topic, level)
        return {"explanation": explanation}
    
    @staticmethod
    def get_conversation_history(user_id: str, limit: int = 10):
        """Get user's recent conversations"""
        return SupabaseService.query_records(
            "chat_conversations",
            lambda q: q.select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit)
        )

import logging
from services.ai_tutor_service import AITutorService
from services.mongo_service import MongoService
import PyPDF2
import docx
import io

logger = logging.getLogger(__name__)

class TutorController:
    @staticmethod
    def chat(user_id: str, message: str, conversation_history: list = None):
        """Chat with AI tutor"""
        if conversation_history is None:
            conversation_history = []
        
        messages = [
            {
                "role": "system",
                "content": "You are Obsidian, an expert AI learning companion. You help students learn by providing clear explanations, answering questions, and offering study guidance. Be encouraging, patient, and educational."
            }
        ]
        
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})
        
        response = AITutorService.chat_completion(messages)
        
        # Save conversation to database
        try:
            conversation_data = {
                "user_id": user_id,
                "messages": messages + [{"role": "assistant", "content": response}]
            }
            MongoService.create_record("chat_conversations", conversation_data)
        except Exception as e:
            logger.warning("Failed to save chat_conversation: %s", e)
        
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
        return MongoService.get_records(
            "chat_conversations",
            filters={"user_id": user_id},
            order_by="-created_at",
            limit=limit
        )

    @staticmethod
    def extract_text(file_stream, filename: str) -> str:
        """Extract text from various file formats"""
        ext = filename.split('.')[-1].lower() if '.' in filename else ''
        
        try:
            if ext == 'pdf':
                reader = PyPDF2.PdfReader(file_stream)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
                
            elif ext in ['docx', 'doc']:
                doc = docx.Document(file_stream)
                return "\n".join([paragraph.text for paragraph in doc.paragraphs])
                
            elif ext in ['txt', 'md', 'csv']:
                return file_stream.read().decode('utf-8')
                
            else:
                raise ValueError(f"Unsupported document format: {ext}")
                
        except Exception as e:
            raise Exception(f"Failed to extract text from {filename}: {str(e)}")

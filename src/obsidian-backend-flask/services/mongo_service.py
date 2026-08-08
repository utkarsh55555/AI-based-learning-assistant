from typing import Dict, Any, List, Optional
from mongo_client import mongo
from bson import ObjectId

class MongoService:
    @staticmethod
    def _clean_doc(doc: Optional[Dict]) -> Optional[Dict]:
        if not doc:
            return doc
        # Convert _id to string to avoid serialization issues
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
        return doc

    @staticmethod
    def create_record(table: str, data: Dict[str, Any], use_admin: bool = False) -> Dict:
        """Create a record in a collection
        
        Args:
            table: Collection name
            data: Record data
            use_admin: Ignored for MongoDB (kept for API compatibility)
        """
        # Make a copy to avoid mutating the original dict with _id
        insert_data = data.copy()
        
        # For user_profiles, handle idempotent behavior (upsert on user_id)
        if table == "user_profiles" and "user_id" in insert_data:
            result = mongo.db[table].find_one_and_update(
                {"user_id": insert_data["user_id"]},
                {"$set": insert_data},
                upsert=True,
                return_document=True
            )
            return MongoService._clean_doc(result)
            
        result = mongo.db[table].insert_one(insert_data)
        insert_data['_id'] = result.inserted_id
        return MongoService._clean_doc(insert_data)
    
    @staticmethod
    def get_record(table: str, id: str, id_column: str = "id") -> Optional[Dict]:
        """Get a single record by ID"""
        # If id_column is 'id' and we are looking at Mongo's internal _id, it needs ObjectId wrapping
        # However, the previous app used 'id' as a string UUID or standard column. 
        # We will query directly.
        query_val = ObjectId(id) if id_column == '_id' else id
        
        doc = mongo.db[table].find_one({id_column: query_val})
        return MongoService._clean_doc(doc)
    
    @staticmethod
    def get_records(table: str, filters: Optional[Dict[str, Any]] = None, 
                   order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """Get multiple records with optional filters"""
        query = filters or {}
        cursor = mongo.db[table].find(query)
        
        if order_by:
            # Simple order_by support (ascending by default in this implementation)
            # If descending is needed, it would require parsing e.g. "-created_at"
            if order_by.startswith('-'):
                cursor = cursor.sort(order_by[1:], -1)
            else:
                cursor = cursor.sort(order_by, 1)
                
        if limit:
            cursor = cursor.limit(limit)
            
        return [MongoService._clean_doc(doc) for doc in cursor]
    
    @staticmethod
    def update_record(table: str, id: str, data: Dict[str, Any], id_column: str = "id", use_admin: bool = False) -> Dict:
        """Update a record"""
        query_val = ObjectId(id) if id_column == '_id' else id
        
        # We don't want to overwrite the whole document, just $set the provided fields
        updated_doc = mongo.db[table].find_one_and_update(
            {id_column: query_val},
            {"$set": data},
            return_document=True
        )
        return MongoService._clean_doc(updated_doc)
    
    @staticmethod
    def delete_record(table: str, id: str, id_column: str = "id") -> bool:
        """Delete a record"""
        query_val = ObjectId(id) if id_column == '_id' else id
        result = mongo.db[table].delete_one({id_column: query_val})
        return result.deleted_count > 0

from supabase_client import get_supabase, get_supabase_admin, get_supabase_admin_client
from typing import Dict, Any, List, Optional

def _check_supabase_client():
    """Check if Supabase client is initialized"""
    try:
        get_supabase()
    except Exception as e:
        raise ValueError(
            f"Supabase client not initialized: {str(e)}. "
            "Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file."
        )

def _get_admin_client():
    """Get admin client, creating it if necessary"""
    try:
        return get_supabase_admin()
    except Exception as e:
        raise ValueError(
            f"Supabase admin client not initialized. "
            f"Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file. "
            f"Error: {str(e)}"
        )
    
class SupabaseService:
    @staticmethod
    def create_record(table: str, data: Dict[str, Any], use_admin: bool = False) -> Dict:
        """Create a record in a table
        
        Args:
            table: Table name
            data: Record data
            use_admin: If True, use admin client (bypasses RLS). Use for server-side operations.
        """
        if use_admin:
            admin_client = _get_admin_client()
            # Verify we're using the admin client
            if admin_client is None:
                raise ValueError("Admin client is None. Check SUPABASE_SERVICE_KEY in .env file.")
            
            # Use the admin client to write (service role key bypasses RLS)
            try:
                # For user_profiles we want idempotent behavior: avoid duplicate user_id errors
                if table == "user_profiles":
                    result = admin_client.table(table).upsert(data, on_conflict="user_id").execute()
                else:
                    result = admin_client.table(table).insert(data).execute()
            except Exception as e:
                error_str = str(e)
                # Provide detailed error information
                if "permission denied" in error_str.lower() or "42501" in error_str:
                    raise Exception(
                        f"Permission denied when creating record in {table} using admin client. "
                        f"This suggests the SUPABASE_SERVICE_KEY might be incorrect or the client "
                        f"is not properly configured. Verify your service role key in the .env file. "
                        f"Original error: {error_str}"
                    )
                raise
        else:
            client = get_supabase()
            result = client.table(table).insert(data).execute()
        return result.data[0] if result.data else None
    
    @staticmethod
    def get_record(table: str, id: str, id_column: str = "id") -> Optional[Dict]:
        """Get a single record by ID"""
        client = get_supabase()
        # Use a regular select without `.single()` so that missing rows don't raise errors.
        # This mimics Supabase's `.maybeSingle()` behavior: 0 rows -> None, 1 row -> dict.
        result = client.table(table).select("*").eq(id_column, id).execute()

        # If the SDK exposes an error, surface it instead of silently failing.
        if getattr(result, "error", None):
            # Let callers handle as an exception with context.
            raise Exception(f"Error fetching record from {table} where {id_column}={id}: {result.error}")

        data = result.data or []
        if not data:
            return None
        # If multiple rows somehow match, return the first one for backward compatibility.
        return data[0]
    
    @staticmethod
    def get_records(table: str, filters: Optional[Dict[str, Any]] = None, 
                   order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """Get multiple records with optional filters"""
        _check_supabase_client()
        query = get_supabase().table(table).select("*")
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        if order_by:
            query = query.order(order_by)
        
        if limit:
            query = query.limit(limit)
        
        result = query.execute()
        return result.data
    
    @staticmethod
    def update_record(table: str, id: str, data: Dict[str, Any], id_column: str = "id", use_admin: bool = False) -> Dict:
        """Update a record
        
        Args:
            table: Table name
            id: Record ID
            data: Update data
            id_column: Column name for ID (default: "id")
            use_admin: If True, use admin client (bypasses RLS). Use for server-side operations.
        """
        if use_admin:
            admin_client = _get_admin_client()
            result = admin_client.table(table).update(data).eq(id_column, id).execute()
        else:
            _check_supabase_client()
            result = get_supabase().table(table).update(data).eq(id_column, id).execute()
        return result.data[0] if result.data else None
    
    @staticmethod
    def delete_record(table: str, id: str, id_column: str = "id") -> bool:
        """Delete a record"""
        _check_supabase_client()
        result = get_supabase().table(table).delete().eq(id_column, id).execute()
        return len(result.data) > 0
    
    @staticmethod
    def query_records(table: str, query_builder) -> List[Dict]:
        """Execute a custom query"""
        _check_supabase_client()
        result = query_builder(get_supabase().table(table)).execute()
        return result.data

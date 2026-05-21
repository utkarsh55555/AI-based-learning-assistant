from typing import Dict, Any, List, Optional
import re

class ValidationError(Exception):
    def __init__(self, errors: Dict[str, str]):
        self.errors = errors
        super().__init__("Validation failed")

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, str]:
    """Validate required fields in data"""
    errors = {}
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == "":
            errors[field] = f"{field} is required"
    return errors

def validate_string_length(value: str, field_name: str, min_length: Optional[int] = None, max_length: Optional[int] = None) -> Optional[str]:
    """Validate string length"""
    if min_length and len(value) < min_length:
        return f"{field_name} must be at least {min_length} characters"
    if max_length and len(value) > max_length:
        return f"{field_name} must not exceed {max_length} characters"
    return None

def validate_choice(value: Any, choices: List[Any], field_name: str) -> Optional[str]:
    """Validate value is in choices"""
    if value not in choices:
        return f"{field_name} must be one of: {', '.join(map(str, choices))}"
    return None

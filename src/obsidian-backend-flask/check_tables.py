"""
Obsidian Backend - Database Table Checker
This script checks if all required tables exist in your Supabase database
and optionally creates them if they don't exist.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from colorama import init, Fore, Style

# Initialize colorama for colored terminal output
init(autoreset=True)

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Required tables for Obsidian
REQUIRED_TABLES = [
    "user_profiles",
    "quizzes",
    "quiz_attempts",
    "mindmaps",
    "notes",
    "study_plans",
    "study_sessions",
    "chat_conversations",
    "user_activities"
]

def check_env_variables():
    """Check if all required environment variables are set"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"{Fore.CYAN}🔍 CHECKING ENVIRONMENT VARIABLES")
    print(f"{Fore.CYAN}{'='*60}\n")
    
    missing_vars = []
    
    if not SUPABASE_URL or SUPABASE_URL == "your-supabase-project-url-here":
        missing_vars.append("SUPABASE_URL")
    else:
        print(f"{Fore.GREEN}✓ SUPABASE_URL: {SUPABASE_URL[:30]}...")
    
    if not SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_KEY == "your-supabase-service-role-key-here":
        missing_vars.append("SUPABASE_SERVICE_KEY")
    else:
        print(f"{Fore.GREEN}✓ SUPABASE_SERVICE_KEY: {'*' * 20}...")
    
    if missing_vars:
        print(f"\n{Fore.RED}❌ ERROR: Missing environment variables:")
        for var in missing_vars:
            print(f"{Fore.RED}   - {var}")
        print(f"\n{Fore.YELLOW}Please update your .env file with valid Supabase credentials.")
        return False
    
    return True

def check_tables():
    """Check which tables exist in the database"""
    try:
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}📊 CHECKING DATABASE TABLES")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        existing_tables = []
        missing_tables = []
        
        for table in REQUIRED_TABLES:
            try:
                # Try to query the table (limit 0 to just check existence)
                response = supabase.table(table).select("*").limit(0).execute()
                existing_tables.append(table)
                print(f"{Fore.GREEN}✓ Table exists: {table}")
            except Exception as e:
                missing_tables.append(table)
                print(f"{Fore.RED}✗ Table missing: {table}")
        
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}📈 SUMMARY")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        print(f"{Fore.GREEN}✓ Existing tables: {len(existing_tables)}/{len(REQUIRED_TABLES)}")
        print(f"{Fore.RED}✗ Missing tables: {len(missing_tables)}/{len(REQUIRED_TABLES)}")
        
        if missing_tables:
            print(f"\n{Fore.YELLOW}⚠️  MISSING TABLES:")
            for table in missing_tables:
                print(f"{Fore.YELLOW}   - {table}")
            
            print(f"\n{Fore.CYAN}{'='*60}")
            print(f"{Fore.YELLOW}🔧 HOW TO CREATE MISSING TABLES")
            print(f"{Fore.CYAN}{'='*60}\n")
            print(f"{Fore.WHITE}1. Go to your Supabase Dashboard: {SUPABASE_URL}/project/_/sql")
            print(f"{Fore.WHITE}2. Click on 'New Query' or 'SQL Editor'")
            print(f"{Fore.WHITE}3. Copy the contents of: obsidian-backend-flask/supabase/migrations/001_initial_schema.sql")
            print(f"{Fore.WHITE}4. Paste and run the SQL script")
            print(f"{Fore.WHITE}5. Then run: obsidian-backend-flask/supabase/policies.sql")
            print(f"{Fore.WHITE}6. Run this script again to verify: npm run check-db\n")
            
            return False
        else:
            print(f"\n{Fore.GREEN}✅ ALL TABLES EXIST!")
            print(f"{Fore.GREEN}Your database is ready to use!\n")
            return True
            
    except Exception as e:
        print(f"\n{Fore.RED}❌ ERROR: {str(e)}")
        print(f"\n{Fore.YELLOW}Make sure your Supabase credentials are correct in the .env file.\n")
        return False

def main():
    """Main function"""
    print(f"\n{Fore.MAGENTA}{'='*60}")
    print(f"{Fore.MAGENTA}🔮 OBSIDIAN DATABASE CHECKER")
    print(f"{Fore.MAGENTA}{'='*60}")
    
    # Check environment variables first
    if not check_env_variables():
        return
    
    # Check tables
    tables_ok = check_tables()
    
    print(f"{Fore.CYAN}{'='*60}\n")
    
    if tables_ok:
        print(f"{Fore.GREEN}🚀 You're ready to run: npm start\n")
    else:
        print(f"{Fore.YELLOW}⚠️  Please create the missing tables before running the app.\n")

if __name__ == "__main__":
    main()

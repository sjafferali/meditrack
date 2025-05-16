#!/usr/bin/env python3
"""
Database migration helper script
"""
import sys
import subprocess
from pathlib import Path

def run_command(cmd):
    """Run a command and handle errors"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return False
        print(result.stdout)
        return True
    except Exception as e:
        print(f"Command failed: {e}")
        return False

def main():
    """Main migration script"""
    if len(sys.argv) < 2:
        print("""
Usage: python migrate.py <command>

Commands:
    up          - Apply all pending migrations
    down        - Downgrade one migration
    current     - Show current migration
    history     - Show migration history
    heads       - Show available heads
    seed        - Apply seed data migration
    create <name> - Create new migration
    reset       - Drop all tables and recreate from scratch
""")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent.parent
    import os
    os.chdir(backend_dir)
    
    # Activate virtual environment if needed
    activate_venv = "source venv/bin/activate && " if Path("venv").exists() else ""
    
    if command == "up":
        print("Applying all pending migrations...")
        run_command(f"{activate_venv}alembic upgrade head")
    
    elif command == "down":
        print("Downgrading one migration...")
        run_command(f"{activate_venv}alembic downgrade -1")
    
    elif command == "current":
        print("Current migration:")
        run_command(f"{activate_venv}alembic current")
    
    elif command == "history":
        print("Migration history:")
        run_command(f"{activate_venv}alembic history --verbose")
    
    elif command == "heads":
        print("Available heads:")
        run_command(f"{activate_venv}alembic heads")
    
    elif command == "seed":
        print("Applying seed data migration...")
        # First ensure we're at the latest migration
        run_command(f"{activate_venv}alembic upgrade head")
    
    elif command == "create":
        if len(sys.argv) < 3:
            print("Error: Migration name required")
            sys.exit(1)
        name = sys.argv[2]
        print(f"Creating migration: {name}")
        run_command(f"{activate_venv}alembic revision -m '{name}'")
    
    elif command == "reset":
        response = input("Warning: This will drop all tables! Continue? (y/N): ")
        if response.lower() == 'y':
            print("Resetting database...")
            # Downgrade to nothing (remove all tables)
            run_command(f"{activate_venv}alembic downgrade base")
            # Upgrade to latest
            run_command(f"{activate_venv}alembic upgrade head")
        else:
            print("Cancelled")
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
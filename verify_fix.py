import os
import requests
import json
from sqlalchemy import create_engine, text

# Use the connection details from the output
DATABASE_URL = "postgresql://meditrackgigi:11AsRHXHYB0f@db.local.samir.systems:5432/meditrackgigi"
API_BASE_URL = os.environ.get('API_BASE_URL', 'http://meditrack.home.samir.network/api/v1')

# Helper function to print colored text
def print_color(text, color):
    colors = {
        'green': '\033[92m',
        'red': '\033[91m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'end': '\033[0m'
    }
    print(f"{colors.get(color, '')}{text}{colors['end']}")

# Create engine
engine = create_engine(DATABASE_URL)

print(f"Connected to database: {DATABASE_URL}")
print(f"Testing API at: {API_BASE_URL}")

def test_db_connection():
    """Test the database connection and print basic info"""
    try:
        with engine.connect() as conn:
            # Count tables
            result = conn.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
            """))
            tables = [row[0] for row in result]
            print(f"Database tables: {tables}")
            
            # Count records in each table
            for table in tables:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                print(f"  - {table}: {count} records")
                
            # Test specific queries
            persons = conn.execute(text("SELECT * FROM persons")).fetchall()
            print(f"Persons: {persons}")
            
            # Check medication-person relationships
            result = conn.execute(text("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(person_id) as with_person,
                    COUNT(*) - COUNT(person_id) as without_person
                FROM medications
            """))
            counts = result.fetchone()
            print(f"Medications: total={counts[0]}, with_person={counts[1]}, without_person={counts[2]}")
            
            return True
    except Exception as e:
        print(f"Database connection error: {e}")
        return False

def test_api_endpoints():
    """Test critical API endpoints"""
    endpoints = [
        '/persons/',
        '/medications/?person_id=1',
        '/health'
    ]
    
    results = {}
    
    for endpoint in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        print(f"Testing endpoint: {url}")
        try:
            response = requests.get(url)
            results[endpoint] = {
                'status_code': response.status_code,
                'content_type': response.headers.get('content-type', ''),
                'data_sample': str(response.text)[:100] + '...' if len(response.text) > 100 else response.text
            }
            
            # For JSON responses, try to parse and get more info
            if 'application/json' in response.headers.get('content-type', ''):
                try:
                    data = response.json()
                    if isinstance(data, list):
                        results[endpoint]['items_count'] = len(data)
                    elif isinstance(data, dict):
                        results[endpoint]['keys'] = list(data.keys())
                except Exception as e:
                    results[endpoint]['parse_error'] = str(e)
                    
            print(f"  Status: {response.status_code}")
            if response.status_code == 200:
                print(f"  Success! Response contains data.")
            else:
                print(f"  Error! Unexpected status code.")
                
        except Exception as e:
            results[endpoint] = {'error': str(e)}
            print(f"  Error: {e}")
    
    return results

def verify_frontend_fix():
    """Verify the frontend fix by checking if assets are loaded correctly"""
    print_color("\n=== Verifying Frontend Fix ===", "blue")
    
    # Check if the main JS file loads (this doesn't guarantee the fix works, but is a good sign)
    try:
        url = "http://meditrack.home.samir.network/static/js/main.12e2595a.js"
        response = requests.head(url)
        if response.status_code == 200:
            print_color("✅ Frontend bundle loads successfully", "green")
        else:
            print_color(f"❌ Frontend bundle not loading: {response.status_code}", "red")
    except Exception as e:
        print_color(f"❌ Error checking frontend assets: {str(e)}", "red")
    
    # Note for manual verification
    print_color("\nManual verification needed:", "yellow")
    print("1. Open http://meditrack.home.samir.network in your browser")
    print("2. You should now see the welcome screen with a 'Select Person' button")
    print("3. Clicking the button should open the person manager dialog")
    print("4. You should see a 'Select' button next to each person in the list")
    print("5. Clicking 'Select' on a person should close the dialog and load their medications")

if __name__ == "__main__":
    print("\n=== Testing Database Connection ===")
    db_ok = test_db_connection()
    
    print("\n=== Testing API Endpoints ===")
    api_results = test_api_endpoints()
    
    # Verify frontend fix
    verify_frontend_fix()
    
    print("\n=== Summary ===")
    if db_ok:
        print_color("✅ Database connection successful", "green")
    else:
        print_color("❌ Database connection failed", "red")
        
    api_ok = all(result.get('status_code', 0) == 200 for result in api_results.values())
    if api_ok:
        print_color("✅ All API endpoints returned 200 OK", "green")
    else:
        print_color("❌ Some API endpoints failed", "red")
        
    if db_ok and api_ok:
        print_color("\n✅ Everything looks good! The application should be working correctly.", "green")
        print_color("Please test the frontend to confirm the fix is working.", "blue")
    else:
        print_color("\n❌ There are still issues that need to be fixed.", "red")
        
    print("\nDone!")
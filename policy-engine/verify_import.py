
import sys
import os

# Add the project root to sys.path so we can import app.main
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from app.main import app
    print("Successfully imported app from policy-engine.app.main")
except Exception as e:
    print(f"Failed to import app: {e}")
    sys.exit(1)

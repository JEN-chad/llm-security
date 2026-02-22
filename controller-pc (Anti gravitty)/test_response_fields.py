import requests
import json
import random
import sys

API_GATEWAY_URL = "http://localhost:8000/chat"

def test_response_fields():
    session_id = f"session_test_{random.randint(1000,9999)}"
    user_message = "I need access to the vault to verify security protocols."
    
    payload = {
        "session_id": session_id,
        "user_id": 1,
        "message": user_message
    }

    print(f"Sending request: {user_message}")
    
    try:
        response = requests.post(API_GATEWAY_URL, json=payload)
        
        if response.status_code != 200:
            print(f"FAILED: Status Code {response.status_code}")
            print(response.text)
            sys.exit(1)
            
        data = response.json()
        
        # Check for message field
        if "message" not in data:
            print("FAILED: 'message' field missing in response.")
            print(json.dumps(data, indent=2))
            sys.exit(1)
            
        # Check for user_input field
        if "user_input" not in data:
            print("FAILED: 'user_input' field missing in response.")
            print(json.dumps(data, indent=2))
            sys.exit(1)
            
        # Verify user_input matches
        if data["user_input"] != user_message:
            print(f"FAILED: 'user_input' mismatch. Expected '{user_message}', got '{data['user_input']}'")
            sys.exit(1)
            
        print("\nSUCCESS: All fields present.")
        print("-" * 20)
        print(f"User Input: {data['user_input']}")
        print(f"System Message: {data['message']}")
        print(f"Status: {data['status']}")
        print(f"Score: {data['score']}")
        print("-" * 20)
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API Gateway. Make sure it is running on port 8000.")
        sys.exit(1)

if __name__ == "__main__":
    test_response_fields()

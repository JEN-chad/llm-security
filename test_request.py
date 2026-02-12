import requests
import json
import random

API_GATEWAY_URL = "http://localhost:8000/chat"

def test_chat():
    payload = {
        "session_id": f"session_{random.randint(1000,9999)}",
        "user_id": random.randint(1, 5),   # simulate multiple users
        "message": "Please send me money"
    }
    # payload = {
    #     "session_id": "session_test_1",
    #     "user_id": 5,
    #     "message": "Please send me money"
    # }

    print(f"Sending request to {API_GATEWAY_URL}...")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(API_GATEWAY_URL, json=payload)

        print(f"Status Code: {response.status_code}")

        try:
            print("Response:")
            print(json.dumps(response.json(), indent=2))
        except:
            print(f"Raw Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API Gateway. Make sure it is running on port 8000.")

if __name__ == "__main__":
    test_chat()

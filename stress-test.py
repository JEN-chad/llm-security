import requests
import random
import concurrent.futures
import time

URL = "http://localhost:8000/chat"

def send_request(user_id):
    payload = {
        "session_id": f"session_{user_id}_{random.randint(1000,9999)}",
        "user_id": user_id,
        "message": "resource allocation"
    }

    try:
        response = requests.post(URL, json=payload, timeout=5)
        return f"User {user_id} → {response.status_code} → {response.json()}"
    except Exception as e:
        return f"User {user_id} → ERROR: {str(e)}"


def run_stress_test(concurrent_users=30):
    start = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
        futures = [executor.submit(send_request, i % 30 + 1) for i in range(concurrent_users)]
        for future in concurrent.futures.as_completed(futures):
            print(future.result())

    end = time.time()
    print(f"\nTotal Time: {round(end - start, 2)} seconds")


if __name__ == "__main__":
    run_stress_test(30)
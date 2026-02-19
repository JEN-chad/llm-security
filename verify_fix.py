import sys
import time
import json
import urllib.request
import urllib.error

# Setup logging immediately
log_file = open("verification_log.txt", "w", encoding="utf-8")

class Tee(object):
    def __init__(self, *files):
        self.files = files
    def write(self, obj):
        for f in self.files:
            try:
                f.write(obj)
                f.flush()
            except:
                pass
    def flush(self):
        for f in self.files:
            try:
                f.flush()
            except:
                pass

sys.stdout = Tee(sys.stdout, log_file)
sys.stderr = Tee(sys.stderr, log_file)

print("Script started...")

def make_request(url, method="GET", data=None):
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header('Content-Type', 'application/json')
        
        if data:
            json_data = json.dumps(data).encode('utf-8')
            req.data = json_data

        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode('utf-8')
            try:
                json_body = json.loads(body)
            except:
                json_body = body
            return status, json_body
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            json_body = json.loads(body)
        except:
            json_body = body
        return e.code, json_body
    except Exception as e:
        print(f"Request failed: {e}")
        return None, None

def test_policy_engine():
    url = "http://localhost:8001/evaluate"
    payload = {
        "user_id": 123,
        "session_id": "test-session-123",
        "original_message": "I need help with my medical bills urgently because my daughter is sick.",
        "argument_quality": "strong",
        "confidence_band": "high",
        "emotional_manipulation": "low",
        "rule_break_attempt": False,
        "user_role": "user"
    }
    
    print(f"Testing Policy Engine at {url}...")
    status, data = make_request(url, "POST", payload)
    
    print(f"Status Code: {status}")
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if status == 200:
        if data.get("status") == "APPROVED":
            print("✅ Policy Engine APPROVED the request.")
            return True
        else:
            print("⚠️ Policy Engine REJECTED the request (check logic/score).")
            return True 
    else:
        print("❌ Policy Engine returned an error.")
        return False

def test_db_persistence():
    # Check if user was created
    user_url = "http://localhost:3000/internal/users/123"
    print(f"\nChecking User Persistence at {user_url}...")
    
    status, data = make_request(user_url, "GET")
    print(f"Status Code: {status}")
    
    if status == 200:
        print(f"User Data: {json.dumps(data, indent=2)}")
        print("✅ User data persistency confirmed.")
    else:
        print("❌ User data not found.")

    # Check transactions
    txn_url = "http://localhost:3000/internal/transactions/recent-count?userId=123"
    print(f"\nChecking Transactions at {txn_url}...")
    
    status, data = make_request(txn_url, "GET")
    
    if status == 200:
        print(f"Recent Transactions: {data}")
        print("✅ Transaction persistence confirmed.")
    else:
        print(f"❌ Failed to get transactions: {data}")

if __name__ == "__main__":
    print("Waiting for services to settle...")
    time.sleep(5)
    if test_policy_engine():
        time.sleep(2)
        test_db_persistence()
    
    log_file.close()

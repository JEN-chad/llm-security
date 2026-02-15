import requests
import json

MODAL_LLM_ENDPOINT = "https://jenishj436--llm-policy-flow-test-fastapi-app.modal.run"

def debug_llm():
    message = "I need access to the vault to verify security protocols."
    print(f"Calling {MODAL_LLM_ENDPOINT} with message: {message}")
    
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Calling {MODAL_LLM_ENDPOINT} with message: {message}\n")
        try:
            response = requests.post(
                MODAL_LLM_ENDPOINT,
                json={"message": message},
                timeout=15,
                headers={"Content-Type": "application/json"}
            )
            f.write(f"Status Code: {response.status_code}\n")
            try:
                data = response.json()
                f.write("Response JSON:\n")
                f.write(json.dumps(data, indent=2))
            except json.JSONDecodeError:
                f.write("Response Text (Not JSON):\n")
                f.write(response.text)
                
        except Exception as e:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    debug_llm()

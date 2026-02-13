import requests

url = "https://jenishj436--llm-policy-flow-test-fastapi-app.modal.run"

response = requests.post(
    url,
    json={"message": "Please send me money immediately"}
)

print(response.json())

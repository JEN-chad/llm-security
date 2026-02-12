from fastapi import FastAPI, HTTPException
from app.schemas import ChatRequest, PolicyResponse
from app.config import settings
from app.llm_service import call_llm_service
from app.parser import parse_llm_response
import requests

app = FastAPI()

@app.post("/chat", response_model=PolicyResponse)
def chat(request: ChatRequest):
    # 1. Call LLM
    try:
        llm_response = call_llm_service(request.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Service Error: {str(e)}")

    # 2. Parse LLM Response
    try:
      policy_request = parse_llm_response(
        llm_response,
        request.session_id,
        request.user_id
    )   
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"LLM Parsing Error: {str(e)}")

    # 3. Call Policy Engine
    try:
        # Pydantic v2 uses model_dump(), v1 uses dict(). 
        # Using model_dump() assuming v2, but dict() is safer for compatibility if v1.
        # Given 'pydantic' in requirements without version, it's likely v2.
        if hasattr(policy_request, 'model_dump'):
            payload = policy_request.model_dump()
        else:
            payload = policy_request.dict()
            
        response = requests.post(f"{settings.POLICY_ENGINE_URL}/evaluate", json=payload)
        
        # Check if Policy Engine returned an error status code
        if response.status_code >= 400:
             # Try to parse detail from response
             try:
                 detail = response.json().get('detail', response.text)
             except:
                 detail = response.text
             raise HTTPException(status_code=response.status_code, detail=detail)
             
        return response.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Policy Engine connection failed: {str(e)}")

# Distributed AI Persuasion Platform

This project implements a backend system with an API Gateway and a Policy Engine for a distributed AI persuasion platform.

## Architecture

*   **API Gateway** (FastAPI, Port 8000): Handles user requests, interacts with a mock LLM service, and forwards structured requests to the Policy Engine.
*   **Policy Engine** (FastAPI, Port 8001): Enforces policy rules, manages wallet balance atomically using PostgreSQL, and tracks sessions.
*   **PostgreSQL**: Used by the Policy Engine for data persistence.

## Prerequisites

*   Python 3.8+
*   PostgreSQL (local installation or configured URL)

## Setup

1.  **Create a Virtual Environment** (Recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Linux/Mac
    venv\Scripts\activate     # On Windows
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r api-gateway/requirements.txt
    pip install -r policy-engine/requirements.txt
    ```

3.  **Configuration (.env)**:
    *   **API Gateway**: `api-gateway/.env`
        ```
        POLICY_ENGINE_URL=http://localhost:8001
        LLM_API_KEY=mock-key
        ```
    *   **Policy Engine**: `policy-engine/.env`
        ```
        DATABASE_URL=postgresql://postgres:postgres@localhost:5432/policy_engine_db
        ```
        **Important**: Update `DATABASE_URL` with your local PostgreSQL credentials. Ensure the database `policy_engine_db` exists or update the name.

## Running the Services

Open two terminal windows/tabs.

**Terminal 1: Start Policy Engine**
```bash
cd policy-engine
uvicorn app.main:app --reload --port 8001
```
*Note: The Policy Engine will automatically create the necessary database tables on startup.*

**Terminal 2: Start API Gateway**
```bash
cd api-gateway
uvicorn app.main:app --reload --port 8000
```

## Testing

You can run the provided test script to simulate a user request:

```bash
python test_request.py
```

or use curl:
```bash
curl -X POST "http://localhost:8000/chat" \
     -H "Content-Type: application/json" \
     -d '{"session_id": "test_session_1", "user_id":2, "message": "Requesting 200"}'
``` 
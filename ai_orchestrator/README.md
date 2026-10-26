# AI Orchestration Service

A lightweight, dedicated Python FastAPI microservice designed for multi-agent AI orchestration and future LangGraph workflow execution.

This service is decoupled from the primary Node.js/Express assessment platform backend. It handles compute-heavy agent graphs and state machines without duplicating customer authentication, candidate session management, or database business logic.

---

## Architecture & Design Principles

1. **Decoupled Architecture**: Runs as an independent microservice alongside the Express API gateway. Express handles candidate JWTs and submissions; this service handles stateful multi-agent graphs.
2. **Zero Logic Duplication**: Does not replicate MongoDB models, user credentials, or JWT signing.
3. **Service-to-Service Security**: All orchestration endpoints (`/api/v1/*`) are protected using timing-safe API key verification (`X-Internal-Service-Key` or `Authorization: Bearer <token>`).
4. **Structured Logging**: Uses `structlog` to output structured JSON in production and readable formatting in development with request correlation IDs (`X-Request-ID`).
5. **Safe Error Responses**: Enforces safe exception handling that sanitizes field errors and internal exceptions so stack traces and secrets are never leaked.
6. **Dedicated LangGraph Module**: The `app/workflows` module establishes abstract base contracts (`BaseWorkflow`, `WorkflowState`) and a workflow registry ready to mount compiled LangGraph `StateGraph` pipelines.

---

## Directory Structure

```
ai_orchestrator/
├── .env.example              # Documented environment variables template
├── .env                      # Local environment configuration
├── requirements.txt          # Python package dependencies
├── README.md                 # Setup and run instructions
└── app/
    ├── __init__.py
    ├── config.py             # Pydantic Settings configuration loader
    ├── logger.py             # Structlog configuration with correlation tracing
    ├── schemas.py            # Validated Pydantic request & response models
    ├── main.py               # FastAPI application with middleware & error handlers
    └── workflows/            # Dedicated module for LangGraph workflows
        ├── __init__.py       # Exports base classes and registry
        ├── base.py           # BaseWorkflow and WorkflowState abstractions
        └── registry.py       # Central registry for graph pipelines
```

---

## Setup & Virtual Environment Instructions

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.10 and 3.11)
- `python3-venv` and `pip`

### 2. Create and Activate Virtual Environment
```bash
# Navigate to the ai_orchestrator directory
cd ai_orchestrator

# Create an isolated virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and adjust settings as needed:
```bash
cp .env.example .env
```

Key environment variables:
- `HOST`: Server interface (default: `127.0.0.1`)
- `PORT`: Server port (default: `8001`)
- `ENVIRONMENT`: `development` or `production`
- `LOG_LEVEL`: `INFO`, `DEBUG`, `WARNING`, `ERROR`
- `INTERNAL_SERVICE_KEY`: Shared secret key used for service-to-service authorization from Express.
- `GEMINI_API_KEY`: Upstream Gemini API key (optional for graph nodes).

---

## Running the Service

### Development Mode (with hot reload):
```bash
# Ensure virtualenv is active
source venv/bin/activate

# Start uvicorn server on port 8001
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### Production Mode:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2
```

---

## Verifying the Service

### 1. Health Check Endpoint (Public)
The `/health` endpoint is unauthenticated for container orchestration and uptime scrapers:
```bash
curl -s http://127.0.0.1:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ai-orchestrator",
  "version": "1.0.0",
  "uptime_seconds": 12.34,
  "environment": "development",
  "timestamp": "2026-10-26T12:00:00.000000+00:00"
}
```

### 2. Authenticated Endpoints
Protected endpoints require the `X-Internal-Service-Key` header:

```bash
# List registered workflows
curl -s -H "X-Internal-Service-Key: dev-orchestrator-internal-key-change-in-prod" \
  http://127.0.0.1:8001/api/v1/workflows

# Dispatch a workflow execution
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Internal-Service-Key: dev-orchestrator-internal-key-change-in-prod" \
  -d '{"workflow_name": "adaptive_hint_flow", "inputs": {"code": "function twoSum() {}"}}' \
  http://127.0.0.1:8001/api/v1/orchestrate
```

---

## Future LangGraph Integration

When adding LangGraph workflows:
1. Define a state graph subclassing `app.workflows.base.WorkflowState`.
2. Implement graph nodes (e.g. `concept_extractor`, `socratic_nudge_generator`).
3. Compile the graph using `graph.compile()`.
4. Register the compiled workflow in `app.workflows.registry.workflow_registry`.

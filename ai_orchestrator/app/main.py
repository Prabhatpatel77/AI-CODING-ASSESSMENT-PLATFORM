"""
FastAPI AI Orchestration Microservice.
Provides secure, service-to-service AI workflow orchestration.
"""

import secrets
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import settings
from .logger import logger
from .schemas import (
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
    WorkflowExecutionRequest,
    WorkflowExecutionResponse,
    WorkflowMetadataResponse,
)
from .workflows import WorkflowState, workflow_registry

# Track service boot time for uptime telemetry
SERVICE_START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for FastAPI startup and shutdown."""
    logger.info(
        "service_starting",
        environment=settings.environment,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level,
    )
    yield
    logger.info("service_shutdown")


app = FastAPI(
    title="AI Orchestration Service",
    description="Dedicated microservice for orchestrating multi-agent AI workflows and LangGraph pipelines.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment.lower() != "production" else None,
    redoc_url=None,
)


# ------------------------------------------------------------------------------
# Request Correlation ID & Structured Logging Middleware
# ------------------------------------------------------------------------------

@app.middleware("http")
async def logging_and_correlation_middleware(request: Request, call_next):
    """Attaches a correlation request ID and logs execution duration."""
    start_time = time.time()
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    response: Optional[Response] = None
    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        # Skip verbose logging for automated health check probes
        if request.url.path != "/health":
            logger.info(
                "http_request_finished",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                request_id=request_id,
            )
        return response
    except Exception as exc:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.exception(
            "unhandled_server_exception",
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            request_id=request_id,
            error=str(exc),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "error": {
                    "code": "INTERNAL_ORCHESTRATION_ERROR",
                    "message": "An internal error occurred during orchestration. Please try again later.",
                    "request_id": request_id,
                },
            },
            headers={"X-Request-ID": request_id},
        )


# ------------------------------------------------------------------------------
# Safe Error Response Handlers
# ------------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Sanitizes Pydantic validation errors into clean, safe error payload."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    errors = []
    for err in exc.errors():
        field_loc = " -> ".join([str(loc) for loc in err.get("loc", [])])
        errors.append({
            "field": field_loc,
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error"),
        })

    logger.warning("request_validation_failed", path=request.url.path, errors=errors, request_id=request_id)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "error": {
                "code": "REQUEST_VALIDATION_ERROR",
                "message": "Input validation failed for the supplied request payload.",
                "request_id": request_id,
                "details": errors,
            },
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Standardizes HTTP exceptions into structured error envelope."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail if isinstance(exc.detail, str) else "A request error occurred.",
                "request_id": request_id,
            },
        },
        headers={"X-Request-ID": request_id},
    )


# ------------------------------------------------------------------------------
# Service-to-Service Authentication Dependency
# ------------------------------------------------------------------------------

async def verify_service_key(
    x_internal_service_key: Optional[str] = Header(None, alias="X-Internal-Service-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """
    Validates internal service-to-service key.
    Accepts either 'X-Internal-Service-Key: <key>' or 'Authorization: Bearer <key>'.
    Uses timing-safe comparison to prevent side-channel timing attacks.
    """
    provided_key: Optional[str] = None

    if x_internal_service_key:
        provided_key = x_internal_service_key.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        provided_key = authorization[7:].strip()

    if not provided_key:
        logger.warning("service_auth_missing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required internal service authentication key.",
        )

    expected_key = settings.internal_service_key
    if not secrets.compare_digest(provided_key, expected_key):
        logger.warning("service_auth_rejected")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid service authentication key.",
        )

    return provided_key


# ------------------------------------------------------------------------------
# Unauthenticated Public Endpoints
# ------------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["Diagnostics"])
async def health():
    """
    Health check endpoint for container probes, uptime monitoring, and smoke testing.
    Unauthenticated to allow standard health-check scrapers.
    """
    uptime = round(time.time() - SERVICE_START_TIME, 2)
    now_iso = datetime.now(timezone.utc).isoformat()

    return HealthResponse(
        status="healthy",
        service="ai-orchestrator",
        version="1.0.0",
        uptime_seconds=uptime,
        environment=settings.environment,
        timestamp=now_iso,
    )


@app.get("/", tags=["Metadata"])
async def root():
    """Root metadata discovery endpoint."""
    return {
        "service": "AI Orchestration Service",
        "description": "Separate microservice dedicated to multi-agent LangGraph workflows",
        "docs": "/docs" if settings.environment.lower() != "production" else "disabled in production",
        "health": "/health",
    }


# ------------------------------------------------------------------------------
# Protected Orchestration Endpoints (Service-to-Service)
# ------------------------------------------------------------------------------

@app.get(
    "/api/v1/workflows",
    response_model=List[WorkflowMetadataResponse],
    dependencies=[Depends(verify_service_key)],
    tags=["Workflows"],
)
async def list_workflows():
    """Lists registered multi-agent LangGraph workflow pipelines."""
    workflows = workflow_registry.list_workflows()
    return [
        WorkflowMetadataResponse(
            name=wf["name"],
            description=wf["description"],
            version="1.0.0",
            supported_node_types=["llm_agent", "evaluator", "guardrail"],
        )
        for wf in workflows
    ]


@app.post(
    "/api/v1/orchestrate",
    response_model=WorkflowExecutionResponse,
    dependencies=[Depends(verify_service_key)],
    tags=["Workflows"],
)
async def orchestrate_workflow(request: WorkflowExecutionRequest):
    """
    Dispatches execution of a registered AI workflow.
    Validates input models and executes the target workflow graph.
    """
    workflow = workflow_registry.get(request.workflow_name)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow '{request.workflow_name}' is not registered in the workflow registry.",
        )

    workflow_id = f"wf_{uuid.uuid4().hex[:12]}"
    state = WorkflowState(
        workflow_id=workflow_id,
        session_id=request.session_id,
        inputs=request.inputs,
    )

    try:
        final_state = await workflow.run(state)
        return WorkflowExecutionResponse(
            workflow_id=final_state.workflow_id,
            workflow_name=request.workflow_name,
            status="completed",
            outputs=final_state.outputs,
            message=final_state.outputs.get("message", "Workflow completed successfully"),
        )
    except Exception as exc:
        logger.exception("workflow_execution_failed", workflow_name=request.workflow_name, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error occurred while executing workflow graph.",
        )

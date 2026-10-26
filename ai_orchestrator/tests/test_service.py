"""
Test Suite for AI Orchestration FastAPI Service.
Tests health endpoint, request validation, authentication, and error handling using Starlette TestClient.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint returns 200, valid schema, and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-orchestrator"
    assert data["version"] == "1.0.0"
    assert isinstance(data["uptime_seconds"], (int, float))
    assert data["uptime_seconds"] >= 0
    assert "timestamp" in data
    assert "environment" in data


def test_root_endpoint():
    """Verify root discovery endpoint returns service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "AI Orchestration Service" in data["service"]
    assert data["health"] == "/health"


def test_protected_endpoint_rejects_missing_key():
    """Verify protected endpoints reject requests missing the internal service key."""
    response = client.get("/api/v1/workflows")
    assert response.status_code == 401
    data = response.json()
    assert data["status"] == "error"
    assert "Missing required" in data["error"]["message"]


def test_protected_endpoint_rejects_invalid_key():
    """Verify protected endpoints reject requests with wrong internal service key."""
    response = client.get(
        "/api/v1/workflows",
        headers={"X-Internal-Service-Key": "wrong-key-value"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["status"] == "error"
    assert "Invalid service authentication key" in data["error"]["message"]


def test_protected_endpoint_accepts_valid_key():
    """Verify protected endpoints succeed with valid service key."""
    response = client.get(
        "/api/v1/workflows",
        headers={"X-Internal-Service-Key": settings.internal_service_key},
    )
    assert response.status_code == 200
    workflows = response.json()
    assert isinstance(workflows, list)
    names = [w["name"] for w in workflows]
    assert "adaptive_hint_flow" in names
    assert "code_review_flow" in names


def test_orchestrate_validation_error():
    """Verify invalid payloads produce sanitized 422 validation errors."""
    response = client.post(
        "/api/v1/orchestrate",
        headers={"X-Internal-Service-Key": settings.internal_service_key},
        json={},  # Missing required workflow_name
    )
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "error"
    assert data["error"]["code"] == "REQUEST_VALIDATION_ERROR"
    assert isinstance(data["error"]["details"], list)


def test_orchestrate_nonexistent_workflow():
    """Verify requesting an unregistered workflow returns 404."""
    response = client.post(
        "/api/v1/orchestrate",
        headers={"X-Internal-Service-Key": settings.internal_service_key},
        json={"workflow_name": "non_existent_graph"},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["status"] == "error"
    assert "not registered" in data["error"]["message"]


def test_orchestrate_valid_workflow():
    """Verify orchestrating a registered workflow returns 200 with result."""
    response = client.post(
        "/api/v1/orchestrate",
        headers={"X-Internal-Service-Key": settings.internal_service_key},
        json={
            "workflow_name": "adaptive_hint_flow",
            "inputs": {"code": "function solution() { return true; }"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["workflow_name"] == "adaptive_hint_flow"
    assert "wf_" in data["workflow_id"]
    assert "outputs" in data

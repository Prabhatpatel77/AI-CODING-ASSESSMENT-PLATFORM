"""
Pydantic Request & Response Validation Models.
Enforces strict boundaries, input sanitation constraints, and safe serialization.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    """Health check response schema."""
    model_config = ConfigDict(extra="forbid")

    status: str = Field(..., description="Service health status, e.g. healthy")
    service: str = Field(default="ai-orchestrator", description="Identifier of the service")
    version: str = Field(default="1.0.0", description="SemVer release version")
    uptime_seconds: float = Field(..., ge=0.0, description="Uptime in seconds since process boot")
    environment: str = Field(..., description="Active runtime environment")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of check")


class ErrorDetail(BaseModel):
    """Sanitized error detail without internal stack traces."""
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable sanitized error message")
    request_id: Optional[str] = Field(default=None, description="Correlation identifier for logs")
    details: Optional[Any] = Field(default=None, description="Optional structured validation error details")


class ErrorResponse(BaseModel):
    """Standardized top-level error response envelope."""
    model_config = ConfigDict(extra="forbid")

    status: str = Field(default="error", description="Error response indicator")
    error: ErrorDetail


# ------------------------------------------------------------------------------
# Hint Orchestration Schemas
# ------------------------------------------------------------------------------

class HintRequest(BaseModel):
    """Input payload for generating Socratic hints."""
    model_config = ConfigDict(extra="ignore")

    problem_title: str = Field(..., min_length=1, max_length=200, description="Title of the challenge")
    problem_description: Optional[str] = Field(default="", max_length=10000, description="Markdown/text problem statement")
    constraints: List[str] = Field(default_factory=list, max_length=20, description="List of problem constraints")
    code: str = Field(..., min_length=1, max_length=65536, description="Candidate source code draft")
    language: str = Field(default="javascript", max_length=50, description="Programming language identifier")
    judge_results: Optional[Dict[str, Any]] = Field(default=None, description="Real test verdicts and stdout/stderr")
    previous_hints: List[str] = Field(default_factory=list, max_length=10, description="Previously unlocked hint texts")
    hint_level: int = Field(default=1, ge=1, le=3, description="Tier 1 (Conceptual), 2 (Algorithmic), 3 (Specific)")


class HintResponse(BaseModel):
    """Structured Socratic hint output."""
    model_config = ConfigDict(extra="forbid")

    status: str = Field(default="success")
    hint_level: int = Field(..., ge=1, le=3)
    stage_label: str = Field(...)
    concept: str = Field(...)
    hint_text: str = Field(...)
    rationale: str = Field(...)
    next_available_level: Optional[int] = Field(default=None)
    has_more_hints: bool = Field(...)


# ------------------------------------------------------------------------------
# Code Review Schemas
# ------------------------------------------------------------------------------

class CodeReviewRequest(BaseModel):
    """Input payload for automated code review & complexity analysis."""
    model_config = ConfigDict(extra="ignore")

    problem_title: Optional[str] = Field(default="", max_length=200)
    code: str = Field(..., min_length=1, max_length=65536)
    language: str = Field(default="javascript", max_length=50)
    submission_context: Optional[Dict[str, Any]] = Field(default=None)


class CodeReviewResponse(BaseModel):
    """Structured code review output."""
    model_config = ConfigDict(extra="forbid")

    status: str = Field(default="success")
    summary: str = Field(...)
    time_complexity: str = Field(...)
    space_complexity: str = Field(...)
    complexity_explanation: str = Field(...)
    algorithmic_pattern: Optional[str] = Field(default=None)
    key_takeaway: Optional[str] = Field(default=None)


# ------------------------------------------------------------------------------
# LangGraph Workflow Orchestration Schemas
# ------------------------------------------------------------------------------

class WorkflowExecutionRequest(BaseModel):
    """Generic payload for executing a multi-step LangGraph workflow."""
    model_config = ConfigDict(extra="ignore")

    workflow_name: str = Field(..., min_length=1, max_length=100, description="Identifier of registered workflow graph")
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Initial state inputs passed to graph nodes")
    session_id: Optional[str] = Field(default=None, description="Optional conversation or session tracking ID")


class WorkflowExecutionResponse(BaseModel):
    """Response returned upon workflow initialization/execution."""
    model_config = ConfigDict(extra="forbid")

    workflow_id: str = Field(..., description="Unique execution UUID")
    workflow_name: str = Field(...)
    status: str = Field(default="completed", description="State: pending, running, completed, or failed")
    outputs: Optional[Dict[str, Any]] = Field(default=None, description="Final StateGraph node outputs")
    message: str = Field(...)


class WorkflowMetadataResponse(BaseModel):
    """Metadata describing a registered LangGraph workflow."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(...)
    description: str = Field(...)
    version: str = Field(default="1.0.0")
    supported_node_types: List[str] = Field(default_factory=list)

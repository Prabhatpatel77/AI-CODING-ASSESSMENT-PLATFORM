"""
Abstract Base Module for Future LangGraph Workflows.
Defines foundational state schemas and interface contracts for graph nodes and edges.
"""

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Dict, Optional
from pydantic import BaseModel, Field


class WorkflowState(BaseModel):
    """
    Base state dictionary container passed across LangGraph nodes.
    Future LangGraph implementations will subclass or extend this TypedDict/BaseModel.
    """
    workflow_id: str = Field(..., description="Unique run identifier")
    session_id: Optional[str] = Field(default=None, description="Optional caller session or thread ID")
    current_node: str = Field(default="start", description="Current node pointer in the graph")
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Raw inputs provided to the workflow")
    outputs: Dict[str, Any] = Field(default_factory=dict, description="Accumulated node outputs")
    error: Optional[str] = Field(default=None, description="Error message if any node failed")


class BaseWorkflow(ABC):
    """
    Contract for multi-agent LangGraph workflows.
    Each workflow manages its own StateGraph, compiled graph instance, and checkpointer.
    """

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    @abstractmethod
    async def run(self, state: WorkflowState) -> WorkflowState:
        """Execute the workflow graph to completion."""
        pass

    @abstractmethod
    async def stream(self, state: WorkflowState) -> AsyncIterator[Dict[str, Any]]:
        """Stream step-by-step state emissions from graph nodes."""
        pass

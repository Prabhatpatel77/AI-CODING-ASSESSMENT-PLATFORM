"""
Workflows Module for Future LangGraph Workflows.
Exports base interfaces and central registry.
"""

from .base import BaseWorkflow, WorkflowState
from .registry import WorkflowRegistry, workflow_registry

__all__ = ["BaseWorkflow", "WorkflowState", "WorkflowRegistry", "workflow_registry"]

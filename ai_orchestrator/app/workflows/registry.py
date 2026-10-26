"""
Workflow Registry for AI Orchestration.
Maintains available LangGraph workflows and provides execution dispatching.
"""

from typing import Dict, List, Optional
from .base import BaseWorkflow, WorkflowState


class PlaceholderWorkflow(BaseWorkflow):
    """
    Placeholder workflow stub illustrating future LangGraph graph execution.
    Does not run actual LLM graphs yet, as requested.
    """

    async def run(self, state: WorkflowState) -> WorkflowState:
        # Placeholder behavior until LangGraph StateGraph is compiled
        state.current_node = "completed"
        state.outputs = {
            "workflow_name": self.name,
            "status": "ready_for_langgraph",
            "message": f"Workflow '{self.name}' initialized. LangGraph nodes will be wired in the upcoming iteration.",
        }
        return state

    async def stream(self, state: WorkflowState):
        yield {"node": "start", "state": state.model_dump()}
        yield {"node": "completed", "state": state.model_dump()}


class WorkflowRegistry:
    """Central registry of available AI workflows."""

    def __init__(self):
        self._workflows: Dict[str, BaseWorkflow] = {}
        self._register_default_workflows()

    def _register_default_workflows(self):
        """Pre-registers the standard multi-agent workflows for the platform."""
        self.register(
            PlaceholderWorkflow(
                name="adaptive_hint_flow",
                description="3-tier progressive Socratic hint generator powered by multi-step graph reasoning",
            )
        )
        self.register(
            PlaceholderWorkflow(
                name="code_review_flow",
                description="Algorithmic complexity, anti-pattern, and edge-case analyzer",
            )
        )
        self.register(
            PlaceholderWorkflow(
                name="rubric_evaluation_flow",
                description="Faculty assessment rubric grader and technical interview feedback synthesizer",
            )
        )

    def register(self, workflow: BaseWorkflow):
        """Registers a workflow implementation."""
        self._workflows[workflow.name] = workflow

    def get(self, name: str) -> Optional[BaseWorkflow]:
        """Retrieves a workflow by name."""
        return self._workflows.get(name)

    def list_workflows(self) -> List[Dict[str, str]]:
        """Returns metadata for all registered workflows."""
        return [
            {"name": wf.name, "description": wf.description}
            for wf in self._workflows.values()
        ]


# Singleton registry instance
workflow_registry = WorkflowRegistry()

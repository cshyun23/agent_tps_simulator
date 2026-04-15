from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class NodeConfig(BaseModel):
    # LLM 노드
    llm_server_id: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    fallback_latency_ms: Optional[int] = None
    concurrency: Optional[int] = None

    # Tool 노드
    tool_latency_ms: Optional[int] = None

    # Conditional 노드
    failure_rate: Optional[float] = None        # 0~100 (%)
    max_retries: Optional[int] = None
    retry_delay_ms: Optional[int] = None
    branches: Optional[list[Branch]] = None

    # Parallel 노드
    fanout_nodes: Optional[list[str]] = None
    fanin_node: Optional[str] = None


class Branch(BaseModel):
    branch_name: str
    target_node: str
    probability: float                          # 0~100 (%)


NodeConfig.model_rebuild()


NodeType = Literal["start", "llm", "tool", "conditional", "parallel", "end"]


class Node(BaseModel):
    id: str
    type: NodeType
    label: str
    position: dict[str, float]
    config: NodeConfig = Field(default_factory=NodeConfig)


class Edge(BaseModel):
    id: str
    source: str
    target: str
    branch: Optional[str] = None
    is_loop: bool = False
    max_loop_count: Optional[int] = None        # is_loop=True 일 때 필수


class Flow(BaseModel):
    flow_id: str
    name: str
    created_at: str
    updated_at: str
    nodes: list[Node] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)

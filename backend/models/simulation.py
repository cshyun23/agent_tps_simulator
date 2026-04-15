from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── 도착 패턴 ─────────────────────────────────────────────

class RampUpPattern(BaseModel):
    type: Literal["ramp_up"] = "ramp_up"
    start_users: int = 0
    peak_users: int
    ramp_duration_sec: int
    hold_duration_sec: int = 0
    ramp_shape: Literal["linear", "smooth"] = "linear"


class WavePattern(BaseModel):
    type: Literal["wave"] = "wave"
    min_users: int
    peak_users: int
    period_sec: int
    wave_count: int = 1
    phase_offset_sec: int = 0


ArrivalPattern = RampUpPattern | WavePattern


# ── 시뮬레이션 설정 ───────────────────────────────────────

class SimulationConfig(BaseModel):
    flow_id: str
    start_node_id: str
    end_node_ids: list[str]
    duration_sec: int
    playback_speed: Literal[1, 2, 5, 10] = 1
    max_hops_per_request: int = 10
    arrival_pattern: ArrivalPattern
    show_p95: bool = True
    show_p99: bool = False


# ── 메트릭 ───────────────────────────────────────────────

class NodeMetricSnapshot(BaseModel):
    node_id: str
    queue_depth: int
    active_requests: int
    avg_wait_ms: float
    avg_process_ms: float
    tps: float
    p95_latency_ms: Optional[float] = None
    p99_latency_ms: Optional[float] = None
    retry_count: int = 0


class FlowMetricSnapshot(BaseModel):
    sim_time_sec: float
    wall_time_sec: float
    total_completed: int
    total_failed: int
    e2e_avg_latency_ms: float
    e2e_p95_latency_ms: Optional[float] = None
    e2e_p99_latency_ms: Optional[float] = None
    overall_tps: float
    bottleneck_node_id: Optional[str] = None
    nodes: list[NodeMetricSnapshot] = Field(default_factory=list)


# ── 시뮬레이션 결과 (히스토리 저장용) ────────────────────

class SimulationResult(BaseModel):
    result_id: str
    flow_id: str
    flow_name: str
    config: SimulationConfig
    started_at: str
    finished_at: str
    snapshots: list[FlowMetricSnapshot] = Field(default_factory=list)
    summary: Optional[SimulationSummary] = None


class NodeSummary(BaseModel):
    node_id: str
    node_label: str
    peak_queue_depth: int
    avg_wait_ms: float
    p95_latency_ms: Optional[float] = None
    p99_latency_ms: Optional[float] = None
    total_processed: int
    total_retries: int


class SimulationSummary(BaseModel):
    total_requests: int
    total_completed: int
    total_failed: int
    failure_rate: float
    e2e_avg_latency_ms: float
    e2e_p95_latency_ms: Optional[float] = None
    e2e_p99_latency_ms: Optional[float] = None
    peak_tps: float
    bottleneck_node_id: Optional[str] = None
    nodes: list[NodeSummary] = Field(default_factory=list)


SimulationResult.model_rebuild()

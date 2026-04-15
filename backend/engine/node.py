"""노드별 처리 시간 계산 및 분기 로직"""
from __future__ import annotations
import math
import random
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from backend.models.flow import Node
    from backend.models.llm_server import LLMServer


TOKEN_STD_RATIO = 0.2   # 토큰 수 정규분포 std = avg × 0.2


def sample_tokens(avg: int) -> int:
    std = max(1, int(avg * TOKEN_STD_RATIO))
    return max(1, int(np.random.normal(avg, std)))


# ── LLM 서버 공유 상태 (물리 서버 단위) ─────────────────────

@dataclass
class LLMServerState:
    """같은 LLM 서버를 여러 노드가 공유할 때 사용하는 서버 단위 상태."""
    server_id: str
    max_concurrent_requests: int
    total_kv_blocks: int

    # 현재 in-flight 요청들의 (요청ID → 현재 KV 블록 사용량) 매핑
    _inflight: dict[str, int] = field(default_factory=dict)

    # prefill 큐: prefill 완료 예정 시간 목록 (heap 대신 단순 리스트)
    _prefill_end_times: list[float] = field(default_factory=list)

    @property
    def used_kv_blocks(self) -> int:
        return sum(self._inflight.values())

    @property
    def free_kv_blocks(self) -> int:
        return self.total_kv_blocks - self.used_kv_blocks

    def can_accept(self, needed_blocks: int) -> bool:
        return self.free_kv_blocks >= needed_blocks

    def start_request(self, req_id: str, initial_blocks: int):
        self._inflight[req_id] = initial_blocks

    def update_kv(self, req_id: str, blocks: int):
        if req_id in self._inflight:
            self._inflight[req_id] = blocks

    def finish_request(self, req_id: str):
        self._inflight.pop(req_id, None)

    def next_prefill_slot(self, current_time: float) -> float:
        """다음으로 prefill을 시작할 수 있는 시간(ms 단위 시뮬레이션 시간)을 반환."""
        # 진행 중인 prefill 중 완료 시간이 current_time 이후인 것만 남김
        active = [t for t in self._prefill_end_times if t > current_time]
        self._prefill_end_times = active
        return max(active) if active else current_time

    def register_prefill(self, end_time: float):
        self._prefill_end_times.append(end_time)


# ── 노드 처리 시간 계산 ───────────────────────────────────

def compute_llm_latency(
    node_cfg,
    server: LLMServer,
    server_state: LLMServerState,
    current_sim_time_ms: float,
    kv_block_size_tokens: int,
) -> tuple[float, str]:
    """
    LLM 노드의 처리 시간을 계산한다.
    반환: (total_latency_ms, req_id)
    """
    import uuid as _uuid
    req_id = str(_uuid.uuid4())

    input_tokens = sample_tokens(node_cfg.input_tokens or 512)
    output_tokens = sample_tokens(node_cfg.output_tokens or 128)

    ref = server.perf_reference

    # prefill 배치 대기
    prefill_wait_ms = max(0.0, server_state.next_prefill_slot(current_sim_time_ms) - current_sim_time_ms)
    prefill_ms = ref.ref_ttft_ms * (input_tokens / max(ref.ref_input_tokens, 1))
    prefill_end = current_sim_time_ms + prefill_wait_ms + prefill_ms
    server_state.register_prefill(prefill_end)

    # decode
    decode_ms = output_tokens * ref.ref_tpop_ms

    total_ms = prefill_wait_ms + prefill_ms + decode_ms

    # KV cache 블록 추적
    needed_blocks = math.ceil((input_tokens + output_tokens) / kv_block_size_tokens)
    server_state.start_request(req_id, needed_blocks)

    return total_ms, req_id


def compute_tool_latency(node_cfg) -> float:
    return float(node_cfg.tool_latency_ms or 500)


def compute_fallback_latency(node_cfg) -> float:
    return float(node_cfg.fallback_latency_ms or 1000)


def resolve_branch(node_cfg) -> str | None:
    """Conditional 노드에서 확률 기반으로 분기를 선택한다."""
    branches = node_cfg.branches
    if not branches:
        return None
    weights = [b.probability for b in branches]
    chosen = random.choices(branches, weights=weights, k=1)[0]
    return chosen.target_node


def is_failure(node_cfg) -> bool:
    """Conditional 노드 실패율 기준으로 실패 여부를 판단한다."""
    rate = node_cfg.failure_rate or 0.0
    return random.random() < rate / 100.0

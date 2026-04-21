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

    # 각 요청의 decode 완료 예정 시간 (요청ID → 완료 시간ms)
    _completion_times: dict[str, float] = field(default_factory=dict)

    # prefill 큐: prefill 완료 예정 시간 목록 (heap 대신 단순 리스트)
    _prefill_end_times: list[float] = field(default_factory=list)

    @property
    def used_kv_blocks(self) -> int:
        return sum(self._inflight.values())

    @property
    def free_kv_blocks(self) -> int:
        return self.total_kv_blocks - self.used_kv_blocks

    def can_accept(self, needed_blocks: int, check_time: float) -> bool:
        """check_time에 needed_blocks만큼 블록이 available한가?"""
        # check_time 이후까지 살아있는 요청들의 블록 합
        active_blocks = sum(
            blocks for req_id, blocks in self._inflight.items()
            if self._completion_times.get(req_id, float('inf')) > check_time
        )
        free = self.total_kv_blocks - active_blocks
        return free >= needed_blocks

    def next_block_free_time(self, check_time: float) -> float:
        """check_time 이후 다음으로 블록이 해제될 시간을 반환."""
        # check_time 이후의 완료 시간들 중 최소값
        future_completions = [
            t for req_id, t in self._completion_times.items()
            if t > check_time and req_id in self._inflight
        ]
        return min(future_completions) if future_completions else check_time

    def start_request(self, req_id: str, initial_blocks: int, completion_time_ms: float):
        """요청 시작. completion_time_ms는 decode 종료 예정 시간."""
        self._inflight[req_id] = initial_blocks
        self._completion_times[req_id] = completion_time_ms

    def update_kv(self, req_id: str, blocks: int):
        if req_id in self._inflight:
            self._inflight[req_id] = blocks

    def finish_request(self, req_id: str):
        """요청 완료 시 KV 블록 해제."""
        self._inflight.pop(req_id, None)
        self._completion_times.pop(req_id, None)

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
    - Prefill 배치 큐 대기
    - KV cache 블록 부족 시 대기
    - Prefill 및 decode 처리 시간

    반환: (total_latency_ms, req_id)
    """
    import uuid as _uuid
    req_id = str(_uuid.uuid4())

    input_tokens = sample_tokens(node_cfg.input_tokens or 512)
    output_tokens = sample_tokens(node_cfg.output_tokens or 128)
    ref = server.perf_reference

    # 1. Prefill 배치 큐 대기
    prefill_wait_ms = max(0.0, server_state.next_prefill_slot(current_sim_time_ms) - current_sim_time_ms)
    prefill_ms = ref.ref_ttft_ms * (input_tokens / max(ref.ref_input_tokens, 1))
    prefill_end = current_sim_time_ms + prefill_wait_ms + prefill_ms
    server_state.register_prefill(prefill_end)

    # 2. Decode 시간
    decode_ms = output_tokens * ref.ref_tpop_ms

    # 3. KV cache 블록 계산 (prefill + decode 동안 필요)
    needed_blocks = math.ceil((input_tokens + output_tokens) / kv_block_size_tokens)

    # 4. KV cache 부족 대기 시간 계산
    # prefill이 끝나고 decode를 시작할 때 필요한 블록 수를 확인
    kv_shortage_wait_ms = 0.0
    check_time = prefill_end  # decode 시작 시점

    while not server_state.can_accept(needed_blocks, check_time):
        # 블록이 부족한 경우, 다음 해제 시간까지 대기
        next_free_time = server_state.next_block_free_time(check_time)
        if next_free_time > check_time:
            check_time = next_free_time
            kv_shortage_wait_ms = check_time - prefill_end
        else:
            # 안전장치: 진행 중인 요청이 없으면 즉시 수용 가능
            break

    # 5. 총 처리 시간: prefill 대기 + prefill + KV 대기 + decode
    total_ms = prefill_wait_ms + prefill_ms + kv_shortage_wait_ms + decode_ms

    # 6. 요청 등록 (decode 완료 시간 포함)
    decode_end_time = check_time + decode_ms
    server_state.start_request(req_id, needed_blocks, decode_end_time)

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

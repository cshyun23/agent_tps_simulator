"""DES (Discrete Event Simulation) 기반 시뮬레이션 코어"""
from __future__ import annotations
import asyncio
import heapq
import time
import uuid
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

from models.flow import Flow, Node
from models.llm_server import LLMServer
from models.simulation import (
    SimulationConfig,
    FlowMetricSnapshot,
    NodeMetricSnapshot,
    SimulationSummary,
    NodeSummary,
)
from engine.arrival import arrival_rate_at
from engine.metrics import NodeMetrics, FlowMetrics
from engine.node import (
    LLMServerState,
    compute_llm_latency,
    compute_tool_latency,
    compute_fallback_latency,
    resolve_branch,
    is_failure,
)


# ── DES 이벤트 ─────────────────────────────────────────────

@dataclass(order=True)
class Event:
    time_ms: float              # 이벤트 발생 시뮬레이션 시간 (ms)
    seq: int                    # 동시각 이벤트 순서 (tie-break)
    kind: str = field(compare=False)
    req_id: str = field(compare=False)
    node_id: str = field(compare=False)
    payload: dict = field(default_factory=dict, compare=False)


# ── 요청 상태 ──────────────────────────────────────────────

@dataclass
class Request:
    req_id: str
    start_time_ms: float
    current_node_id: str
    hop_count: int = 0
    loop_counts: dict = field(default_factory=dict)  # edge_id → count
    parallel_pending: dict = field(default_factory=dict)  # fanin_node_id → {branch_node_ids}
    llm_server_req_ids: dict = field(default_factory=dict)  # server_id → req_id (KV 추적용)
    node_enqueue_times: dict = field(default_factory=dict)  # node_id → enqueue time (큐 대기 계산용)
    failed: bool = False


# ── DES 시뮬레이터 ─────────────────────────────────────────

class DESSimulator:
    SNAPSHOT_INTERVAL_MS = {1: 500, 2: 250, 5: 100, 10: 50}

    def __init__(self, flow: Flow, config: SimulationConfig, servers: dict[str, LLMServer]):
        self.flow = flow
        self.config = config
        self.servers = servers

        self._nodes: dict[str, Node] = {n.id: n for n in flow.nodes}
        self._edges_from: dict[str, list] = {}
        for e in flow.edges:
            self._edges_from.setdefault(e.source, []).append(e)

        self._server_states: dict[str, LLMServerState] = {}
        for s in servers.values():
            kv = s.kv_cache
            self._server_states[s.server_id] = LLMServerState(
                server_id=s.server_id,
                max_concurrent_requests=kv.max_concurrent_requests,
                total_kv_blocks=kv.total_kv_blocks,
            )

        self._node_metrics: dict[str, NodeMetrics] = {
            n.id: NodeMetrics(node_id=n.id) for n in flow.nodes
        }
        self._flow_metrics = FlowMetrics()

        self._heap: list[Event] = []
        self._seq = 0
        self._requests: dict[str, Request] = {}
        self._stopped = False
        self.snapshots: list[FlowMetricSnapshot] = []

    def stop(self):
        self._stopped = True

    def _push(self, time_ms: float, kind: str, req_id: str, node_id: str, payload: dict = {}):
        self._seq += 1
        heapq.heappush(self._heap, Event(time_ms, self._seq, kind, req_id, node_id, payload))

    def _schedule_arrivals(self):
        """도착 패턴에 따라 요청 도착 이벤트를 스케줄링한다."""
        duration_ms = self.config.duration_sec * 1000
        # 1초 단위로 λ를 샘플링하여 포아송 프로세스로 이벤트 생성
        import numpy as np
        t_ms = 0.0
        avg_flow_sec = self._estimate_avg_flow_duration()
        rng = np.random.default_rng()

        while t_ms < duration_ms:
            t_sec = t_ms / 1000.0
            lam = arrival_rate_at(self.config.arrival_pattern, t_sec, avg_flow_sec)
            if lam > 0:
                # 다음 이벤트까지의 간격: 지수분포 Exp(λ)
                interval_sec = rng.exponential(1.0 / lam)
                t_ms += interval_sec * 1000.0
            else:
                t_ms += 100.0  # λ=0이면 100ms 단위로 재확인
                continue

            if t_ms >= duration_ms:
                break

            req_id = str(uuid.uuid4())
            self._push(t_ms, "arrive", req_id, self.config.start_node_id)

    def _estimate_avg_flow_duration(self) -> float:
        """플로우 평균 처리 시간을 대략 추정한다 (arrival rate 계산용)."""
        total_ms = 0.0
        for node in self.flow.nodes:
            cfg = node.config
            if node.type == "llm":
                server_id = cfg.llm_server_id
                if server_id and server_id in self.servers:
                    s = self.servers[server_id]
                    ref = s.perf_reference
                    total_ms += ref.ref_ttft_ms + (cfg.output_tokens or 128) * ref.ref_tpop_ms
                else:
                    total_ms += cfg.fallback_latency_ms or 1000
            elif node.type == "tool":
                total_ms += cfg.tool_latency_ms or 500
        return max(total_ms / 1000.0, 0.1)

    async def run(self) -> AsyncIterator[FlowMetricSnapshot]:
        """DES 루프. 이벤트를 처리하며 주기적으로 스냅샷을 yield한다."""
        self._schedule_arrivals()

        duration_ms = self.config.duration_sec * 1000
        snap_interval = self.SNAPSHOT_INTERVAL_MS.get(self.config.playback_speed, 500)
        next_snap_ms = float(snap_interval)

        wall_start = time.monotonic()
        current_time_ms = 0.0
        window_start_ms = 0.0

        while self._heap and not self._stopped:
            event = heapq.heappop(self._heap)
            current_time_ms = event.time_ms

            if current_time_ms > duration_ms:
                break

            self._process_event(event, current_time_ms)

            # 스냅샷 발행
            if current_time_ms >= next_snap_ms:
                window_sec = (current_time_ms - window_start_ms) / 1000.0
                snapshot = self._build_snapshot(current_time_ms, wall_start, window_sec)
                self.snapshots.append(snapshot)
                yield snapshot
                self._reset_windows()
                window_start_ms = current_time_ms
                next_snap_ms = current_time_ms + snap_interval

            # 재생 속도 조절: 실제 시간과 시뮬레이션 시간 동기화
            elapsed_wall_ms = (time.monotonic() - wall_start) * 1000
            expected_wall_ms = current_time_ms / self.config.playback_speed
            if expected_wall_ms > elapsed_wall_ms:
                await asyncio.sleep((expected_wall_ms - elapsed_wall_ms) / 1000.0)

    def _process_event(self, event: Event, now_ms: float):
        kind = event.kind

        if kind == "arrive":
            self._on_arrive(event, now_ms)
        elif kind == "dequeue":
            self._on_dequeue(event, now_ms)
        elif kind == "complete":
            self._on_complete(event, now_ms)
        elif kind == "retry":
            self._on_arrive(event, now_ms)  # 재시도는 재도착과 동일
        elif kind == "parallel_branch_done":
            self._on_parallel_branch_done(event, now_ms)

    def _on_arrive(self, event: Event, now_ms: float):
        req_id = event.req_id
        node_id = event.node_id
        node = self._nodes.get(node_id)
        if not node:
            return

        # 새 요청이면 등록
        if req_id not in self._requests:
            self._requests[req_id] = Request(
                req_id=req_id,
                start_time_ms=now_ms,
                current_node_id=node_id,
            )

        req = self._requests[req_id]
        req.hop_count += 1

        # 글로벌 hop 초과
        if req.hop_count > self.config.max_hops_per_request:
            self._fail_request(req_id)
            return

        nm = self._node_metrics[node_id]
        nm.queue_depth += 1
        req.node_enqueue_times[node_id] = now_ms

        # End 노드: 즉시 완료
        if node.type == "end":
            nm.queue_depth -= 1
            self._complete_flow(req_id, now_ms)
            return

        # 처리 시간 계산 후 dequeue 이벤트 스케줄
        latency_ms = self._calc_latency(node, req, now_ms)
        wait_ms = now_ms - req.node_enqueue_times.get(node_id, now_ms)
        nm.record_wait(max(0.0, wait_ms))
        self._push(now_ms + latency_ms, "complete", req_id, node_id)
        nm.queue_depth -= 1
        nm.active_requests += 1

    def _calc_latency(self, node: Node, req: Request, now_ms: float) -> float:
        cfg = node.config
        if node.type == "llm":
            server_id = cfg.llm_server_id
            if server_id and server_id in self._server_states:
                server = self.servers[server_id]
                state = self._server_states[server_id]
                kv_block_size = server.kv_cache.kv_block_size_tokens
                latency, srv_req_id = compute_llm_latency(cfg, server, state, now_ms, kv_block_size)
                req.llm_server_req_ids[server_id] = srv_req_id
                return latency
            return compute_fallback_latency(cfg)
        elif node.type == "tool":
            return compute_tool_latency(cfg)
        return 0.0

    def _on_complete(self, event: Event, now_ms: float):
        req_id = event.req_id
        node_id = event.node_id
        req = self._requests.get(req_id)
        if not req or req.failed:
            return

        node = self._nodes.get(node_id)
        nm = self._node_metrics[node_id]
        nm.active_requests = max(0, nm.active_requests - 1)

        process_ms = now_ms - (req.start_time_ms if len(self._nodes) == 1 else 0)
        nm.record_process(process_ms)
        nm.tick_completed(now_ms)

        # KV cache 해제
        for server_id, srv_req_id in req.llm_server_req_ids.items():
            if server_id in self._server_states:
                self._server_states[server_id].finish_request(srv_req_id)
        req.llm_server_req_ids.clear()

        if not node:
            return

        # Conditional 분기
        if node.type == "conditional":
            cfg = node.config
            if is_failure(cfg):
                retries = req.loop_counts.get(f"retry_{node_id}", 0)
                max_r = cfg.max_retries or 0
                if retries < max_r:
                    req.loop_counts[f"retry_{node_id}"] = retries + 1
                    nm.record_retry()
                    delay = cfg.retry_delay_ms or 0
                    self._push(now_ms + delay, "retry", req_id, node_id)
                else:
                    self._fail_request(req_id)
                return

            next_node_id = resolve_branch(cfg)
            if next_node_id:
                self._route_to_next(req, req_id, node_id, next_node_id, now_ms)
            return

        # Parallel fan-out
        if node.type == "parallel":
            cfg = node.config
            fanout = cfg.fanout_nodes or []
            fanin = cfg.fanin_node
            if fanout and fanin:
                req.parallel_pending[fanin] = set(fanout)
                for fn_id in fanout:
                    branch_req_id = f"{req_id}__branch__{fn_id}"
                    self._requests[branch_req_id] = Request(
                        req_id=branch_req_id,
                        start_time_ms=now_ms,
                        current_node_id=fn_id,
                    )
                    self._push(now_ms, "arrive", branch_req_id, fn_id)
            return

        # 일반 다음 노드로 라우팅
        edges = self._edges_from.get(node_id, [])
        if not edges:
            self._complete_flow(req_id, now_ms)
            return

        # branch 없는 일반 엣지 (첫 번째만 사용)
        normal_edges = [e for e in edges if not e.branch]
        if normal_edges:
            next_node_id = normal_edges[0].target
            self._route_to_next(req, req_id, node_id, next_node_id, now_ms, edge=normal_edges[0])

    def _route_to_next(self, req, req_id, from_node_id, next_node_id, now_ms, edge=None):
        # 루프 엣지 횟수 체크
        if edge and edge.is_loop:
            count = req.loop_counts.get(edge.id, 0) + 1
            if count > (edge.max_loop_count or 0):
                self._fail_request(req_id)
                return
            req.loop_counts[edge.id] = count

        # 병렬 브랜치 완료 신호
        if "__branch__" in req_id:
            parent_req_id, _, branch_node_id = req_id.partition("__branch__")
            self._push(now_ms, "parallel_branch_done", parent_req_id, next_node_id,
                       {"branch_node_id": from_node_id, "result_node_id": next_node_id})
            return

        self._push(now_ms, "arrive", req_id, next_node_id)

    def _on_parallel_branch_done(self, event: Event, now_ms: float):
        req_id = event.req_id
        req = self._requests.get(req_id)
        if not req:
            return

        branch_node_id = event.payload.get("branch_node_id")
        result_node_id = event.payload.get("result_node_id")

        # 어느 fanin 노드에 속하는지 확인
        for fanin_id, pending in list(req.parallel_pending.items()):
            if branch_node_id in pending:
                pending.discard(branch_node_id)
                if not pending:
                    del req.parallel_pending[fanin_id]
                    self._push(now_ms, "arrive", req_id, fanin_id)
                break

    def _complete_flow(self, req_id: str, now_ms: float):
        req = self._requests.pop(req_id, None)
        if not req:
            return
        e2e = now_ms - req.start_time_ms
        self._flow_metrics.record_e2e(e2e)

    def _fail_request(self, req_id: str):
        req = self._requests.pop(req_id, None)
        if req:
            self._flow_metrics.record_failed()

    def _build_snapshot(self, now_ms: float, wall_start: float, window_sec: float) -> FlowMetricSnapshot:
        node_snaps = []
        bottleneck_id = None
        max_wait = -1.0

        for node_id, nm in self._node_metrics.items():
            p95 = nm.p95_ms() if self.config.show_p95 else None
            p99 = nm.p99_ms() if self.config.show_p99 else None
            avg_wait = nm.avg_wait_ms()
            if avg_wait > max_wait:
                max_wait = avg_wait
                bottleneck_id = node_id

            node_snaps.append(NodeMetricSnapshot(
                node_id=node_id,
                queue_depth=nm.queue_depth,
                active_requests=nm.active_requests,
                avg_wait_ms=avg_wait,
                avg_process_ms=nm.avg_process_ms(),
                tps=nm.tps(window_sec),
                p95_latency_ms=p95,
                p99_latency_ms=p99,
                retry_count=nm.total_retries,
            ))

        fm = self._flow_metrics
        return FlowMetricSnapshot(
            sim_time_sec=now_ms / 1000.0,
            wall_time_sec=time.monotonic() - wall_start,
            total_completed=fm.total_completed,
            total_failed=fm.total_failed,
            e2e_avg_latency_ms=fm.avg_e2e_ms(),
            e2e_p95_latency_ms=fm.p95_e2e_ms() if self.config.show_p95 else None,
            e2e_p99_latency_ms=fm.p99_e2e_ms() if self.config.show_p99 else None,
            overall_tps=fm.tps(window_sec),
            bottleneck_node_id=bottleneck_id,
            nodes=node_snaps,
        )

    def _reset_windows(self):
        for nm in self._node_metrics.values():
            nm.reset_window()
        self._flow_metrics.reset_window()

    def get_summary(self) -> SimulationSummary:
        fm = self._flow_metrics
        total = fm.total_completed + fm.total_failed
        node_summaries = []
        bottleneck_id = None
        max_wait = -1.0

        for node_id, nm in self._node_metrics.items():
            node = self._nodes[node_id]
            avg_wait = nm.avg_wait_ms()
            if avg_wait > max_wait:
                max_wait = avg_wait
                bottleneck_id = node_id
            node_summaries.append(NodeSummary(
                node_id=node_id,
                node_label=node.label,
                peak_queue_depth=nm.queue_depth,
                avg_wait_ms=avg_wait,
                p95_latency_ms=nm.p95_ms(),
                p99_latency_ms=nm.p99_ms(),
                total_processed=nm.total_processed,
                total_retries=nm.total_retries,
            ))

        return SimulationSummary(
            total_requests=total,
            total_completed=fm.total_completed,
            total_failed=fm.total_failed,
            failure_rate=fm.total_failed / max(total, 1) * 100,
            e2e_avg_latency_ms=fm.avg_e2e_ms(),
            e2e_p95_latency_ms=fm.p95_e2e_ms(),
            e2e_p99_latency_ms=fm.p99_e2e_ms(),
            peak_tps=max((s.overall_tps for s in self.snapshots), default=0.0),
            bottleneck_node_id=bottleneck_id,
            nodes=node_summaries,
        )

"""메트릭 집계 (avg, P95, P99)"""
from __future__ import annotations
import numpy as np
from collections import deque
from dataclasses import dataclass, field


@dataclass
class NodeMetrics:
    node_id: str
    # 완료된 요청들의 대기/처리 시간 기록 (최근 N개)
    _wait_times: deque = field(default_factory=lambda: deque(maxlen=10000))
    _process_times: deque = field(default_factory=lambda: deque(maxlen=10000))
    _retry_count: int = 0
    _total_processed: int = 0
    _completed_in_window: int = 0      # 최근 1초 내 완료 수 (TPS 계산용)
    _window_start: float = 0.0
    queue_depth: int = 0
    active_requests: int = 0

    def record_wait(self, wait_ms: float):
        self._wait_times.append(wait_ms)

    def record_process(self, process_ms: float):
        self._process_times.append(process_ms)
        self._total_processed += 1

    def record_retry(self):
        self._retry_count += 1

    def tick_completed(self, sim_time: float):
        """요청 완료 시 호출. TPS 윈도우 갱신."""
        self._completed_in_window += 1

    def tps(self, window_sec: float = 1.0) -> float:
        return self._completed_in_window / max(window_sec, 1e-9)

    def reset_window(self):
        self._completed_in_window = 0

    def avg_wait_ms(self) -> float:
        return float(np.mean(self._wait_times)) if self._wait_times else 0.0

    def avg_process_ms(self) -> float:
        return float(np.mean(self._process_times)) if self._process_times else 0.0

    def p95_ms(self) -> float | None:
        if len(self._process_times) < 20:
            return None
        return float(np.percentile(list(self._process_times), 95))

    def p99_ms(self) -> float | None:
        if len(self._process_times) < 100:
            return None
        return float(np.percentile(list(self._process_times), 99))

    @property
    def total_retries(self) -> int:
        return self._retry_count

    @property
    def total_processed(self) -> int:
        return self._total_processed


@dataclass
class FlowMetrics:
    _e2e_times: deque = field(default_factory=lambda: deque(maxlen=50000))
    _total_completed: int = 0
    _total_failed: int = 0
    _completed_in_window: int = 0

    def record_e2e(self, latency_ms: float):
        self._e2e_times.append(latency_ms)
        self._total_completed += 1
        self._completed_in_window += 1

    def record_failed(self):
        self._total_failed += 1

    def tps(self, window_sec: float = 1.0) -> float:
        return self._completed_in_window / max(window_sec, 1e-9)

    def reset_window(self):
        self._completed_in_window = 0

    def avg_e2e_ms(self) -> float:
        return float(np.mean(self._e2e_times)) if self._e2e_times else 0.0

    def p95_e2e_ms(self) -> float | None:
        if len(self._e2e_times) < 20:
            return None
        return float(np.percentile(list(self._e2e_times), 95))

    def p99_e2e_ms(self) -> float | None:
        if len(self._e2e_times) < 100:
            return None
        return float(np.percentile(list(self._e2e_times), 99))

    @property
    def total_completed(self) -> int:
        return self._total_completed

    @property
    def total_failed(self) -> int:
        return self._total_failed

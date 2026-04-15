"""요청 도착 패턴 생성 (Ramp-up / Wave)"""
import math
from backend.models.simulation import RampUpPattern, WavePattern, ArrivalPattern


def users_at(pattern: ArrivalPattern, t: float) -> float:
    """시뮬레이션 시간 t(초)에서의 동시 사용자 수를 반환한다."""
    if isinstance(pattern, RampUpPattern):
        return _ramp_up(pattern, t)
    return _wave(pattern, t)


def _ramp_up(p: RampUpPattern, t: float) -> float:
    if p.ramp_duration_sec <= 0:
        return float(p.peak_users)

    if t <= p.ramp_duration_sec:
        ratio = t / p.ramp_duration_sec
        if p.ramp_shape == "smooth":
            # ease-in-out (S-curve)
            ratio = ratio * ratio * (3 - 2 * ratio)
        return p.start_users + (p.peak_users - p.start_users) * ratio

    plateau_end = p.ramp_duration_sec + p.hold_duration_sec
    if t <= plateau_end or p.hold_duration_sec == 0:
        return float(p.peak_users)

    return 0.0


def _wave(p: WavePattern, t: float) -> float:
    phase = 2 * math.pi * (t - p.phase_offset_sec) / p.period_sec
    # sin: -1 ~ 1 → min ~ peak
    amplitude = (p.peak_users - p.min_users) / 2
    center = (p.peak_users + p.min_users) / 2
    return center + amplitude * math.sin(phase)


def arrival_rate_at(pattern: ArrivalPattern, t: float, avg_flow_duration_sec: float) -> float:
    """
    t 시점의 도착률 λ (요청/초)를 반환한다.
    Little's Law: λ = N / W  (N=동시 사용자, W=평균 처리 시간)
    """
    n = max(0.0, users_at(pattern, t))
    if avg_flow_duration_sec <= 0:
        return 0.0
    return n / avg_flow_duration_sec

import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from models.simulation import SimulationConfig, SimulationResult
from engine.simulator import DESSimulator

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data" / "simulation_results"

# 현재 실행 중인 시뮬레이션 (동시 1개만 허용)
_active: Optional[DESSimulator] = None
_active_task: Optional[asyncio.Task] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── 시뮬레이션 히스토리 ────────────────────────────────────

@router.get("/history")
def list_history() -> list[dict]:
    result = []
    for f in sorted(DATA_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        data = json.loads(f.read_text())
        result.append({
            "result_id": data["result_id"],
            "flow_name": data["flow_name"],
            "started_at": data["started_at"],
            "finished_at": data["finished_at"],
            "summary": data.get("summary"),
        })
    return result


@router.get("/history/{result_id}")
def get_result(result_id: str) -> SimulationResult:
    p = DATA_DIR / f"{result_id}.json"
    if not p.exists():
        raise HTTPException(status_code=404, detail="Result not found")
    return SimulationResult.model_validate_json(p.read_text())


@router.delete("/history/{result_id}", status_code=204)
def delete_result(result_id: str):
    p = DATA_DIR / f"{result_id}.json"
    if not p.exists():
        raise HTTPException(status_code=404, detail="Result not found")
    p.unlink()


# ── WebSocket 시뮬레이션 실행 ─────────────────────────────

@router.websocket("/ws")
async def simulation_ws(websocket: WebSocket):
    global _active, _active_task
    await websocket.accept()

    try:
        # 시뮬레이션 설정 수신
        raw = await websocket.receive_json()
        config = SimulationConfig.model_validate(raw)

        # 동시 실행 방지
        if _active is not None:
            await websocket.send_json({"type": "error", "message": "이미 실행 중인 시뮬레이션이 있습니다."})
            await websocket.close()
            return

        # 플로우 로드
        flow_path = Path(__file__).parent.parent / "data" / "flows" / f"{config.flow_id}.json"
        if not flow_path.exists():
            await websocket.send_json({"type": "error", "message": "Flow not found"})
            await websocket.close()
            return

        from models.flow import Flow
        flow = Flow.model_validate_json(flow_path.read_text())

        # LLM 서버 목록 로드
        servers_dir = Path(__file__).parent.parent / "data" / "llm_servers"
        servers = {}
        for f in servers_dir.glob("*.json"):
            from models.llm_server import LLMServer
            s = LLMServer.model_validate_json(f.read_text())
            servers[s.server_id] = s

        result_id = str(uuid.uuid4())
        started_at = _now()

        _active = DESSimulator(flow=flow, config=config, servers=servers)

        await websocket.send_json({"type": "started", "result_id": result_id})

        # 시뮬레이션 루프
        async for snapshot in _active.run():
            await websocket.send_json({"type": "snapshot", "data": snapshot.model_dump()})

        # 결과 저장
        summary = _active.get_summary()
        result = SimulationResult(
            result_id=result_id,
            flow_id=config.flow_id,
            flow_name=flow.name,
            config=config,
            started_at=started_at,
            finished_at=_now(),
            snapshots=_active.snapshots,
            summary=summary,
        )
        (DATA_DIR / f"{result_id}.json").write_text(result.model_dump_json(indent=2))

        await websocket.send_json({"type": "finished", "result_id": result_id, "summary": summary.model_dump()})

    except WebSocketDisconnect:
        if _active is not None:
            _active.stop()
    finally:
        _active = None
        _active_task = None


@router.post("/stop", status_code=204)
def stop_simulation():
    global _active
    if _active is not None:
        _active.stop()
        _active = None

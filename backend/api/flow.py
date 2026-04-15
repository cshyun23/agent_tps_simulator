import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from backend.models.flow import Flow

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data" / "flows"


def _path(flow_id: str) -> Path:
    return DATA_DIR / f"{flow_id}.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/")
def list_flows() -> list[dict]:
    result = []
    for f in sorted(DATA_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        data = json.loads(f.read_text())
        result.append({"flow_id": data["flow_id"], "name": data["name"], "updated_at": data["updated_at"]})
    return result


@router.post("/", status_code=201)
def create_flow(payload: dict) -> Flow:
    flow_id = str(uuid.uuid4())
    now = _now()
    flow = Flow(
        flow_id=flow_id,
        name=payload.get("name", "새 플로우"),
        created_at=now,
        updated_at=now,
        nodes=payload.get("nodes", []),
        edges=payload.get("edges", []),
    )
    _path(flow_id).write_text(flow.model_dump_json(indent=2))
    return flow


@router.get("/{flow_id}")
def get_flow(flow_id: str) -> Flow:
    p = _path(flow_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Flow not found")
    return Flow.model_validate_json(p.read_text())


@router.put("/{flow_id}")
def update_flow(flow_id: str, payload: dict) -> Flow:
    p = _path(flow_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Flow not found")
    existing = Flow.model_validate_json(p.read_text())
    updated = existing.model_copy(update={
        "name": payload.get("name", existing.name),
        "nodes": payload.get("nodes", existing.nodes),
        "edges": payload.get("edges", existing.edges),
        "updated_at": _now(),
    })
    p.write_text(updated.model_dump_json(indent=2))
    return updated


@router.delete("/{flow_id}", status_code=204)
def delete_flow(flow_id: str):
    p = _path(flow_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Flow not found")
    p.unlink()


@router.post("/{flow_id}/duplicate", status_code=201)
def duplicate_flow(flow_id: str) -> Flow:
    p = _path(flow_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Flow not found")
    original = Flow.model_validate_json(p.read_text())
    now = _now()
    new_flow = original.model_copy(update={
        "flow_id": str(uuid.uuid4()),
        "name": f"{original.name} (복사본)",
        "created_at": now,
        "updated_at": now,
    })
    _path(new_flow.flow_id).write_text(new_flow.model_dump_json(indent=2))
    return new_flow

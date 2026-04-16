import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from models.llm_server import LLMServer, GPUReference

router = APIRouter()
DATA_DIR = Path(__file__).parent.parent / "data" / "llm_servers"
GPU_REF_PATH = Path(__file__).parent.parent / "data" / "gpu_reference.json"


def _path(server_id: str) -> Path:
    return DATA_DIR / f"{server_id}.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── LLM 서버 CRUD ─────────────────────────────────────────

@router.get("/servers")
def list_servers() -> list[LLMServer]:
    result = []
    for f in sorted(DATA_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        result.append(LLMServer.model_validate_json(f.read_text()))
    return result


@router.post("/servers", status_code=201)
def create_server(payload: dict) -> LLMServer:
    server_id = str(uuid.uuid4())
    server = LLMServer(server_id=server_id, created_at=_now(), **payload)
    _path(server_id).write_text(server.model_dump_json(indent=2))
    return server


@router.get("/servers/{server_id}")
def get_server(server_id: str) -> LLMServer:
    p = _path(server_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Server not found")
    return LLMServer.model_validate_json(p.read_text())


@router.put("/servers/{server_id}")
def update_server(server_id: str, payload: dict) -> LLMServer:
    p = _path(server_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Server not found")
    existing = LLMServer.model_validate_json(p.read_text())
    updated = existing.model_copy(update=payload)
    p.write_text(updated.model_dump_json(indent=2))
    return updated


@router.delete("/servers/{server_id}", status_code=204)
def delete_server(server_id: str):
    p = _path(server_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Server not found")
    p.unlink()


@router.get("/servers/export/all")
def export_servers():
    servers = [LLMServer.model_validate_json(f.read_text()) for f in DATA_DIR.glob("*.json")]
    return servers


@router.post("/servers/import")
def import_servers(file: UploadFile = File(...)):
    data = json.loads(file.file.read())
    servers = [LLMServer.model_validate(s) for s in data]
    for s in servers:
        _path(s.server_id).write_text(s.model_dump_json(indent=2))
    return {"imported": len(servers)}


# ── GPU 레퍼런스 ──────────────────────────────────────────

@router.get("/gpu-reference")
def get_gpu_reference() -> GPUReference:
    return GPUReference.model_validate_json(GPU_REF_PATH.read_text())


@router.get("/gpu-reference/download")
def download_gpu_reference():
    return FileResponse(GPU_REF_PATH, media_type="application/json", filename="gpu_reference.json")


@router.post("/gpu-reference/upload")
def upload_gpu_reference(file: UploadFile = File(...)):
    data = json.loads(file.file.read())
    ref = GPUReference.model_validate(data)
    GPU_REF_PATH.write_text(ref.model_dump_json(indent=2))
    return {"gpus": len(ref.gpus)}

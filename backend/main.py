from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import flow, llm_hub, simulation

app = FastAPI(title="Agent TPS Simulator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flow.router, prefix="/api/flows", tags=["flows"])
app.include_router(llm_hub.router, prefix="/api/llm-hub", tags=["llm-hub"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["simulation"])


@app.get("/health")
def health():
    return {"status": "ok"}

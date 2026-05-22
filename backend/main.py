from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, ensure_directories
from database import init_db
from routers import bloodwork, supplements, profile, wearables, insights


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_directories()
    init_db()
    yield


app = FastAPI(title="VitalIQ", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bloodwork.router)
app.include_router(supplements.router)
app.include_router(profile.router)
app.include_router(wearables.router)
app.include_router(insights.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "VitalIQ", "version": "0.1.0"}

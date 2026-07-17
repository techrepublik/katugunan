from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel

from app.core.config import settings
from app.core.db import engine
from app.api.endpoints import router as api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.mount("/media", StaticFiles(directory="/app/media"), name="media")

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # Sync SQLModel schemas to Postgres DB dynamically on startup
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Katugunan Survey System FastAPI Backend"}

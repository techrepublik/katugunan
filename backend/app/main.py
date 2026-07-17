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

from sqlmodel import text

@app.on_event("startup")
async def on_startup():
    # Dynamic DB schema updates: add uuid column if not present
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid VARCHAR(36);"))
        await conn.run_sync(SQLModel.metadata.create_all)
        
    # Backfill UUIDs & update QR payload and code images for users lacking a UUID
    from sqlmodel import select
    from sqlmodel.ext.asyncio.session import AsyncSession
    from app.models.models import User
    from app.api.endpoints import generate_qr_code_file
    import uuid
    
    async with AsyncSession(engine) as session:
        res = await session.exec(select(User).where((User.uuid == None) | (User.uuid == "")))
        users_to_update = res.all()
        if users_to_update:
            for u in users_to_update:
                u.uuid = str(uuid.uuid4())
                payload = f"{settings.PUBLIC_BASE_URL.rstrip('/')}/survey/{u.uuid}"
                u.qrcode_payload = payload
                u.qrcode_image_url = generate_qr_code_file(u.username, payload)
                session.add(u)
            await session.commit()

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Katugunan Survey System FastAPI Backend"}

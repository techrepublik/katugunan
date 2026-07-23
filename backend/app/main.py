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
    # Dynamic DB schema updates: add uuid and permissions column if not present
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid VARCHAR(36);"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;"))
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

    # Seed default Client Types & Regions if empty
    from app.models.models import ClientType, Region, Permission, Role
    async with AsyncSession(engine) as session:
        ct_res = await session.exec(select(ClientType))
        if not ct_res.first():
            default_cts = ["Student", "Faculty", "Staff", "Alumni", "Visitor"]
            for ct_name in default_cts:
                session.add(ClientType(name=ct_name))
        
        r_res = await session.exec(select(Region))
        if not r_res.first():
            default_regions = ["Region XII", "NCR", "BARMM"]
            for r_name in default_regions:
                session.add(Region(name=r_name))
                
        # Seed/Ensure default permissions exist
        default_perms = [
            {"name": "manage_users", "label": "Manage Users", "description": "Allows creating, updating, and deleting system accounts"},
            {"name": "manage_services", "label": "Manage Services", "description": "Allows modification of service catalog configurations"},
            {"name": "manage_questions", "label": "Manage Questions", "description": "Allows editing survey evaluation questions"},
            {"name": "manage_metadata", "label": "Manage Metadata", "description": "Allows editing region and client type dropdown options"},
            {"name": "view_audit_logs", "label": "View Audit Logs", "description": "Allows viewing database-level action tracking logs"},
            {"name": "view_analytics", "label": "View Analytics Insights", "description": "Allows viewing the survey analytics insights page"},
            {"name": "view_monitor", "label": "View Live Monitor", "description": "Allows viewing the live satisfaction monitor page"},
            {"name": "view_personnel_monitor", "label": "View Personnel Performance", "description": "Allows viewing the personnel performance monitoring page"},
            {"name": "view_personnel_responses", "label": "View Detailed Responses", "description": "Allows viewing the detailed survey responses ledger"},
            {"name": "view_org_tree", "label": "View Org Tree Explorer", "description": "Allows viewing the organizational hierarchy tree page"},
            {"name": "manage_roles", "label": "Manage Roles & Permissions", "description": "Allows managing access roles and system permission scopes"}
        ]
        for p in default_perms:
            existing = await session.exec(select(Permission).where(Permission.name == p["name"]))
            if not existing.first():
                session.add(Permission(**p))

        # Seed/Ensure default roles exist and have defaults bound
        from app.models.models import OrganizationNode
        
        # 1. Fetch distinct node types from database
        node_types_res = await session.exec(select(OrganizationNode.node_type).distinct())
        distinct_types = node_types_res.all()
        
        # 2. Base default roles
        default_roles = [
            {"name": "Super", "description": "Super Administrator with complete system access", "permissions": [
                "manage_users", "manage_services", "manage_questions", "manage_metadata", "view_audit_logs",
                "view_analytics", "view_monitor", "view_personnel_monitor", "view_personnel_responses", "view_org_tree", "manage_roles"
            ]},
            {"name": "Admin", "description": "Standard Administrator with write permissions except user accounts modification", "permissions": [
                "manage_services", "manage_questions", "manage_metadata", "view_audit_logs",
                "view_analytics", "view_monitor", "view_personnel_monitor", "view_personnel_responses", "view_org_tree"
            ]},
            {"name": "Client", "description": "End-user / Client account for filling out surveys", "permissions": []}
        ]
        
        # 3. Dynamically append roles for distinct node types
        for nt in distinct_types:
            if not nt:
                continue
            role_name = nt.title()
            if role_name not in ["Super", "Admin", "Client"]:
                default_roles.append({
                    "name": role_name,
                    "description": f"{role_name}-level satisfaction monitor and dashboard viewer",
                    "permissions": [
                        "view_analytics", "view_monitor", "view_personnel_monitor", "view_personnel_responses", "view_org_tree"
                    ]
                })

        for r_data in default_roles:
            role_db = (await session.exec(select(Role).where(Role.name == r_data["name"]))).first()
            if not role_db:
                session.add(Role(**r_data))
            else:
                # Merge permissions for standard roles to ensure they are updated
                new_perms = list(set(role_db.permissions or []) | set(r_data["permissions"]))
                role_db.permissions = new_perms
                session.add(role_db)

        await session.commit()

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Katugunan Survey System FastAPI Backend"}

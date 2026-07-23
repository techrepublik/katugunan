import os
from datetime import timedelta
from typing import Any, List
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status, Request, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import text

from app.core.config import settings
from app.core.db import get_session
from app.core.security import create_access_token, verify_password, get_password_hash
from app.api import deps
from app.crud import crud
from app.models.models import User, UserLevel, NodeType, OrganizationNode, ClientType, Region
from app.schemas import schemas

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Helper to generate QR code files locally
def generate_qr_code_file(username: str, payload: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Target path inside media volume
    os.makedirs("/app/media/qrcodes", exist_ok=True)
    path = f"/app/media/qrcodes/{username}.png"
    img.save(path)
    return f"/media/qrcodes/{username}.png"

# Auth Endpoints
@router.post("/auth/login", response_model=schemas.Token)
async def login_access_token(
    request: Request,
    session: AsyncSession = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = await crud.get_user_by_email(session, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        # We can optionally log failed logins
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Audit logging
    await crud.create_audit_log(
        session, 
        user.username, 
        "LOGIN", 
        "User logged in successfully", 
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/auth/me", response_model=schemas.UserOut)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    # Resolve role permissions
    role_permissions = []
    if current_user.user_level:
        from app.models.models import Role
        from sqlmodel import select
        level_str = (current_user.user_level.value if hasattr(current_user.user_level, "value") else str(current_user.user_level)).lower()
        res = await session.execute(select(Role).where(text("LOWER(name) = :name")).params(name=level_str))
        role = res.scalar_one_or_none()
        if role and role.permissions:
            role_permissions = role.permissions
            
    # Combine role permissions + overrides
    # If Super, they get all permissions
    curr_level_lower = (current_user.user_level.value if hasattr(current_user.user_level, "value") else str(current_user.user_level)).lower() if current_user.user_level else ""
    if curr_level_lower == "super":
        from app.models.models import Permission
        from sqlmodel import select
        all_perms_res = await session.execute(select(Permission))
        resolved_perms = [p.name for p in all_perms_res.scalars().all()]
    else:
        resolved_perms = list(set(role_permissions) | set(current_user.permissions or []))
        
    # Return user dict with resolved permissions
    user_data = current_user.model_dump()
    user_data["permissions"] = resolved_perms
    return user_data

# Organization Nodes Endpoints
@router.post("/org-nodes", response_model=schemas.OrgNodeOut)
async def create_org_node_route(
    node_in: schemas.OrgNodeCreate,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_node = await crud.create_org_node(session, node_in)
    
    # Synchronize bidirectional relationship
    if db_node.assigned_user_id:
        other_nodes = await session.execute(
            select(OrganizationNode)
            .where(OrganizationNode.assigned_user_id == db_node.assigned_user_id)
            .where(OrganizationNode.id != db_node.id)
        )
        for node in other_nodes.scalars().all():
            node.assigned_user_id = None
            session.add(node)
            
        new_user = await session.get(User, db_node.assigned_user_id)
        if new_user:
            new_user.org_node_id = db_node.id
            session.add(new_user)
        await session.commit()
        await session.refresh(db_node)
        
    await crud.create_audit_log(session, current_user.username, "CREATE_ORG_NODE", f"Created organizational node: {db_node.name} ({db_node.node_type})")
    return db_node

@router.get("/org-nodes", response_model=List[schemas.OrgNodeOut], dependencies=[Depends(deps.allow_dashboard)])
async def read_org_nodes(
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_org_nodes(session, current_user=current_user)

@router.get("/org-nodes/tree", response_model=List[schemas.OrgNodeTreeOut], dependencies=[Depends(deps.has_permission("view_org_tree"))])
async def read_org_node_tree(
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    root_node_id = None
    if current_user.user_level not in ["Super", "Admin"]:
        root_node_id = current_user.org_node_id
        if not root_node_id:
            return []
    return await crud.get_org_node_tree(session, root_node_id=root_node_id)

@router.put("/org-nodes/{node_id}", response_model=schemas.OrgNodeOut)
async def update_org_node(
    node_id: int,
    node_in: schemas.OrgNodeUpdate,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_node = await session.get(OrganizationNode, node_id)
    if not db_node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    old_assigned_user_id = db_node.assigned_user_id
    node_data = node_in.model_dump(exclude_unset=True)
    for key, value in node_data.items():
        setattr(db_node, key, value)
        
    session.add(db_node)
    
    # Synchronize bidirectional relationship
    if "assigned_user_id" in node_data and old_assigned_user_id != db_node.assigned_user_id:
        if old_assigned_user_id:
            old_user = await session.get(User, old_assigned_user_id)
            if old_user and old_user.org_node_id == db_node.id:
                old_user.org_node_id = None
                session.add(old_user)
        
        if db_node.assigned_user_id:
            other_nodes = await session.execute(
                select(OrganizationNode)
                .where(OrganizationNode.assigned_user_id == db_node.assigned_user_id)
                .where(OrganizationNode.id != db_node.id)
            )
            for node in other_nodes.scalars().all():
                node.assigned_user_id = None
                session.add(node)
                
            new_user = await session.get(User, db_node.assigned_user_id)
            if new_user:
                new_user.org_node_id = db_node.id
                session.add(new_user)

    await session.commit()
    await session.refresh(db_node)
    await crud.create_audit_log(session, current_user.username, "UPDATE_ORG_NODE", f"Updated organizational node: {db_node.name}")
    return db_node

@router.delete("/org-nodes/{node_id}")
async def delete_org_node(
    node_id: int,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_node = await session.get(OrganizationNode, node_id)
    if not db_node:
        raise HTTPException(status_code=404, detail="Node not found")
    name = db_node.name
    await session.delete(db_node)
    await session.commit()
    await crud.create_audit_log(session, current_user.username, "DELETE_ORG_NODE", f"Deleted organizational node: {name}")
    return {"success": True}

# Services Endpoints
@router.post("/services", response_model=schemas.ServiceOut)
async def create_service_route(
    service_in: schemas.ServiceCreate,
    current_user: User = Depends(deps.has_permission("manage_services")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_svc = await crud.create_service(session, service_in)
    await crud.create_audit_log(session, current_user.username, "CREATE_SERVICE", f"Created service catalog item: {db_svc.service_name}")
    return db_svc

@router.get("/services", response_model=List[schemas.ServiceOut])
async def read_services(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_services(session)

@router.put("/services/{service_id}", response_model=schemas.ServiceOut)
async def update_service_route(
    service_id: int,
    service_in: schemas.ServiceCreate,
    current_user: User = Depends(deps.has_permission("manage_services")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_service = await crud.get_service(session, service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    db_service.service_name = service_in.service_name
    db_service.service_no = service_in.service_no
    db_service.service_type = service_in.service_type
    db_service.service_time = service_in.service_time
    db_service.service_is_payment = service_in.service_is_payment
    db_service.org_node_id = service_in.org_node_id
    
    session.add(db_service)
    await session.commit()
    await session.refresh(db_service)
    await crud.create_audit_log(session, current_user.username, "UPDATE_SERVICE", f"Updated service catalog item: {db_service.service_name}")
    return db_service

@router.delete("/services/{service_id}")
async def delete_service_route(
    service_id: int,
    current_user: User = Depends(deps.has_permission("manage_services")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_service = await crud.get_service(session, service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    name = db_service.service_name
    await session.delete(db_service)
    await session.commit()
    await crud.create_audit_log(session, current_user.username, "DELETE_SERVICE", f"Deleted service catalog item: {name}")
    return {"success": True}

# Questions Endpoints
@router.post("/questions", response_model=schemas.QuestionOut)
async def create_question_route(
    question_in: schemas.QuestionCreate,
    current_user: User = Depends(deps.has_permission("manage_questions")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_question = await crud.create_question(session, question_in)
    await crud.create_audit_log(session, current_user.username, "CREATE_QUESTION", f"Created survey question: {db_question.question_id}")
    return db_question

@router.get("/questions", response_model=List[schemas.QuestionOut])
async def read_questions(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_questions(session)

@router.put("/questions/{q_id}", response_model=schemas.QuestionOut)
async def update_question_route(
    q_id: int,
    question_in: schemas.QuestionCreate,
    current_user: User = Depends(deps.has_permission("manage_questions")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_question = await crud.get_question(session, q_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    db_question.question_id = question_in.question_id
    db_question.question_question = question_in.question_question
    db_question.question_type = question_in.question_type
    session.add(db_question)
    await session.commit()
    await session.refresh(db_question)
    await crud.create_audit_log(session, current_user.username, "UPDATE_QUESTION", f"Updated survey question: {db_question.question_id}")
    return db_question

@router.delete("/questions/{q_id}")
async def delete_question_route(
    q_id: int,
    current_user: User = Depends(deps.has_permission("manage_questions")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_question = await crud.get_question(session, q_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    q_id_text = db_question.question_id
    await session.delete(db_question)
    await session.commit()
    await crud.create_audit_log(session, current_user.username, "DELETE_QUESTION", f"Deleted survey question: {q_id_text}")
    return {"success": True}

# Users Endpoints
@router.post("/users", response_model=schemas.UserOut)
async def create_user_route(
    user_in: schemas.UserCreate,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_user = await crud.get_user_by_username(session, user_in.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    db_user = await crud.create_user(session, user_in)
    
    # Generate QR code using UUID
    payload = f"{settings.PUBLIC_BASE_URL.rstrip('/')}/survey/{db_user.uuid}"
    qr_url = generate_qr_code_file(db_user.username, payload)
    
    db_user.qrcode_payload = payload
    db_user.qrcode_image_url = qr_url
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    
    # Synchronize bidirectional relationship
    if db_user.org_node_id:
        from app.models.models import OrganizationNode
        node = await session.get(OrganizationNode, db_user.org_node_id)
        if node:
            if node.assigned_user_id and node.assigned_user_id != db_user.id:
                prev_user = await session.get(User, node.assigned_user_id)
                if prev_user and prev_user.org_node_id == db_user.org_node_id:
                    prev_user.org_node_id = None
                    session.add(prev_user)
            node.assigned_user_id = db_user.id
            session.add(node)
            await session.commit()
            await session.refresh(db_user)
    
    await crud.create_audit_log(
        session, 
        current_user.username, 
        "CREATE_USER", 
        f"Created user account: {db_user.username} (Level: {db_user.user_level})"
    )
    return db_user

@router.get("/users", response_model=List[schemas.UserOut], dependencies=[Depends(deps.has_any_permission(["manage_users", "view_personnel_monitor", "view_personnel_responses", "view_org_tree"]))])
async def read_users(
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_users(session, current_user=current_user)

@router.get("/users/public/{identifier}", response_model=schemas.UserOut)
async def read_user_public(
    identifier: str,
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_user = await crud.get_user_by_uuid(session, identifier)
    if not db_user:
        db_user = await crud.get_user_by_username(session, identifier)
        
    if not db_user or not db_user.is_active:
        raise HTTPException(status_code=404, detail="Officer profile not found")
    return db_user

@router.put("/users/me", response_model=schemas.UserOut)
async def update_user_me(
    user_in: schemas.UserUpdate,
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    if user_in.email is not None:
        current_user.email = user_in.email
    if user_in.first_name is not None:
        current_user.first_name = user_in.first_name
    if user_in.last_name is not None:
        current_user.last_name = user_in.last_name
    if user_in.middle_name is not None:
        current_user.middle_name = user_in.middle_name
    if user_in.id_number is not None:
        current_user.id_number = user_in.id_number
    if user_in.sex is not None:
        current_user.sex = user_in.sex
    if user_in.birth_date is not None:
        current_user.birth_date = user_in.birth_date
    if user_in.contact_no is not None:
        current_user.contact_no = user_in.contact_no
        
    if user_in.password:
        current_user.hashed_password = get_password_hash(user_in.password)
        
    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)
    
    await crud.create_audit_log(
        session, 
        current_user.username, 
        "UPDATE_PROFILE", 
        "User updated their own profile settings"
    )
    return current_user

@router.put("/users/{user_id}", response_model=schemas.UserOut)
async def update_user_admin(
    user_id: int,
    user_in: schemas.UserUpdate,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_user = await crud.get_user(session, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # RBAC constraint: Admin accounts cannot edit Super accounts
    curr_level = (current_user.user_level.value if hasattr(current_user.user_level, "value") else str(current_user.user_level)).lower() if current_user.user_level else ""
    db_level = (db_user.user_level.value if hasattr(db_user.user_level, "value") else str(db_user.user_level)).lower() if db_user.user_level else ""
    if curr_level == "admin" and db_level == "super":
        raise HTTPException(status_code=403, detail="Admin level users cannot modify Super level accounts")
        
    old_node_id = db_user.org_node_id
    if user_in.email is not None:
        db_user.email = user_in.email
    if user_in.first_name is not None:
        db_user.first_name = user_in.first_name
    if user_in.last_name is not None:
        db_user.last_name = user_in.last_name
    if user_in.middle_name is not None:
        db_user.middle_name = user_in.middle_name
    if user_in.id_number is not None:
        db_user.id_number = user_in.id_number
    if user_in.sex is not None:
        db_user.sex = user_in.sex
    if user_in.birth_date is not None:
        db_user.birth_date = user_in.birth_date
    if user_in.contact_no is not None:
        db_user.contact_no = user_in.contact_no
    if user_in.org_node_id is not None:
        db_user.org_node_id = user_in.org_node_id
    if user_in.is_active is not None:
        db_user.is_active = user_in.is_active
        
    if user_in.user_level is not None:
        target_level = (user_in.user_level.value if hasattr(user_in.user_level, "value") else str(user_in.user_level)).lower()
        if curr_level == "admin" and target_level == "super":
            raise HTTPException(status_code=403, detail="Admin level users cannot promote accounts to Super level")
        db_user.user_level = user_in.user_level
        
    if user_in.permissions is not None:
        if curr_level == "admin":
            admin_perms = current_user.permissions or []
            for p in user_in.permissions:
                if p not in admin_perms:
                    raise HTTPException(status_code=403, detail=f"Cannot assign permission '{p}' which you do not possess")
        db_user.permissions = user_in.permissions
        
    if user_in.password:
        db_user.hashed_password = get_password_hash(user_in.password)
        
    session.add(db_user)
    
    # Synchronize bidirectional relationship
    if user_in.org_node_id is not None and old_node_id != user_in.org_node_id:
        from app.models.models import OrganizationNode
        # Clear the old node's assigned user if it was this user
        if old_node_id:
            old_node = await session.get(OrganizationNode, old_node_id)
            if old_node and old_node.assigned_user_id == db_user.id:
                old_node.assigned_user_id = None
                session.add(old_node)
        
        # Clear any other node assigned to this user
        other_nodes = await session.execute(
            select(OrganizationNode)
            .where(OrganizationNode.assigned_user_id == db_user.id)
            .where(OrganizationNode.id != user_in.org_node_id)
        )
        for node in other_nodes.scalars().all():
            node.assigned_user_id = None
            session.add(node)
            
        # Set the new node's assigned user
        if user_in.org_node_id:
            new_node = await session.get(OrganizationNode, user_in.org_node_id)
            if new_node:
                if new_node.assigned_user_id and new_node.assigned_user_id != db_user.id:
                    prev_assigned_user = await session.get(User, new_node.assigned_user_id)
                    if prev_assigned_user and prev_assigned_user.org_node_id == user_in.org_node_id:
                        prev_assigned_user.org_node_id = None
                        session.add(prev_assigned_user)
                new_node.assigned_user_id = db_user.id
                session.add(new_node)
                
    await session.commit()
    await session.refresh(db_user)
    
    await crud.create_audit_log(
        session, 
        current_user.username, 
        "UPDATE_USER", 
        f"Admin updated settings for user: {db_user.username}"
    )
    return db_user
 
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_user = await crud.get_user(session, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    curr_level = (current_user.user_level.value if hasattr(current_user.user_level, "value") else str(current_user.user_level)).lower() if current_user.user_level else ""
    db_level = (db_user.user_level.value if hasattr(db_user.user_level, "value") else str(db_user.user_level)).lower() if db_user.user_level else ""
    if curr_level == "admin" and db_level == "super":
        raise HTTPException(status_code=403, detail="Admin level users cannot delete Super level accounts")
        
    username_deleted = db_user.username
    await session.delete(db_user)
    await session.commit()
    
    await crud.create_audit_log(
        session, 
        current_user.username, 
        "DELETE_USER", 
        f"Deleted user account: {username_deleted}"
    )
    return {"success": True}

@router.get("/audit-logs", response_model=List[schemas.AuditLogOut])
async def read_audit_logs(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.has_permission("view_audit_logs"))
) -> Any:
    return await crud.get_audit_logs(session)

# Permissions Endpoints
@router.get("/permissions", response_model=List[schemas.PermissionOut])
async def read_permissions(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.has_permission("manage_users"))
) -> Any:
    return await crud.get_permissions(session)

@router.post("/permissions", response_model=schemas.PermissionOut)
async def create_permission_route(
    p_in: schemas.PermissionCreate,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    from sqlmodel import select
    from app.models.models import Permission
    res = await session.execute(select(Permission).where(Permission.name == p_in.name))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Permission key name already exists")
    db_p = await crud.create_permission(session, p_in)
    await crud.create_audit_log(session, current_user.username, "CREATE_PERMISSION", f"Created security permission: {db_p.name}")
    return db_p

@router.put("/permissions/{p_id}", response_model=schemas.PermissionOut)
async def update_permission_route(
    p_id: int,
    p_in: schemas.PermissionCreate,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_p = await crud.get_permission(session, p_id)
    if not db_p:
        raise HTTPException(status_code=404, detail="Permission not found")
    from sqlmodel import select
    from app.models.models import Permission
    res = await session.execute(select(Permission).where(Permission.name == p_in.name, Permission.id != p_id))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Permission with this name already exists")
    old_name = db_p.name
    db_p = await crud.update_permission(session, db_p, p_in)
    await crud.create_audit_log(session, current_user.username, "UPDATE_PERMISSION", f"Updated permission {old_name} settings")
    return db_p

@router.delete("/permissions/{p_id}")
async def delete_permission_route(
    p_id: int,
    current_user: User = Depends(deps.has_permission("manage_users")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_p = await crud.get_permission(session, p_id)
    if not db_p:
        raise HTTPException(status_code=404, detail="Permission not found")
    name = db_p.name
    await crud.delete_permission(session, db_p)
    await crud.create_audit_log(session, current_user.username, "DELETE_PERMISSION", f"Deleted permission: {name}")
    return {"success": True}

# Roles Endpoints
@router.get("/roles", response_model=List[schemas.RoleOut])
async def read_roles(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(deps.has_permission("manage_roles"))
) -> Any:
    return await crud.get_roles(session)

@router.post("/roles", response_model=schemas.RoleOut)
async def create_role_route(
    r_in: schemas.RoleCreate,
    current_user: User = Depends(deps.has_permission("manage_roles")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    from sqlmodel import select
    from app.models.models import Role
    res = await session.execute(select(Role).where(Role.name == r_in.name))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role name already exists")
    db_role = await crud.create_role(session, r_in)
    await crud.create_audit_log(session, current_user.username, "CREATE_ROLE", f"Created security role: {db_role.name}")
    return db_role

@router.put("/roles/{r_id}", response_model=schemas.RoleOut)
async def update_role_route(
    r_id: int,
    r_in: schemas.RoleCreate,
    current_user: User = Depends(deps.has_permission("manage_roles")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_role = await crud.get_role(session, r_id)
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    if db_role.name == "Super" and current_user.user_level != "Super":
        raise HTTPException(status_code=403, detail="Only Super level administrators can modify the Super role")
        
    from sqlmodel import select
    from app.models.models import Role
    res = await session.execute(select(Role).where(Role.name == r_in.name, Role.id != r_id))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role with this name already exists")
        
    old_name = db_role.name
    db_role = await crud.update_role(session, db_role, r_in)
    await crud.create_audit_log(session, current_user.username, "UPDATE_ROLE", f"Updated settings for role {old_name}")
    return db_role

@router.delete("/roles/{r_id}")
async def delete_role_route(
    r_id: int,
    current_user: User = Depends(deps.has_permission("manage_roles")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_role = await crud.get_role(session, r_id)
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    if db_role.name in ["Super", "Admin", "Unit", "Client"]:
        raise HTTPException(status_code=400, detail="System default roles cannot be deleted")
    name = db_role.name
    await crud.delete_role(session, db_role)
    await crud.create_audit_log(session, current_user.username, "DELETE_ROLE", f"Deleted role: {name}")
    return {"success": True}

@router.get("/survey-metadata")
async def get_survey_metadata(
    session: AsyncSession = Depends(get_session)
):
    client_types = await crud.get_client_types(session)
    regions = await crud.get_regions(session)
    return {
        "client_types": [ct.name for ct in client_types],
        "regions": [r.name for r in regions]
    }

# Client Type Endpoints
@router.get("/client-types", response_model=List[schemas.ClientTypeOut], dependencies=[Depends(deps.has_permission("manage_metadata"))])
async def read_client_types(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_client_types(session)

@router.post("/client-types", response_model=schemas.ClientTypeOut)
async def create_client_type_route(
    ct_in: schemas.ClientTypeCreate,
    current_user: User = Depends(deps.has_permission("manage_metadata")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    from sqlmodel import select
    res = await session.execute(select(ClientType).where(ClientType.name == ct_in.name))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Client type already exists")
    db_ct = await crud.create_client_type(session, ct_in)
    await crud.create_audit_log(session, current_user.username, "CREATE_CLIENT_TYPE", f"Created client type: {db_ct.name}")
    return db_ct

@router.delete("/client-types/{ct_id}")
async def delete_client_type_route(
    ct_id: int,
    current_user: User = Depends(deps.has_permission("manage_metadata")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_ct = await crud.get_client_type(session, ct_id)
    if not db_ct:
        raise HTTPException(status_code=404, detail="Client type not found")
    name = db_ct.name
    await session.delete(db_ct)
    await session.commit()
    await crud.create_audit_log(session, current_user.username, "DELETE_CLIENT_TYPE", f"Deleted client type: {name}")
    return {"success": True}

@router.put("/client-types/{ct_id}", response_model=schemas.ClientTypeOut)
async def update_client_type_route(
    ct_id: int,
    ct_in: schemas.ClientTypeCreate,
    current_user: User = Depends(deps.has_permission("manage_metadata")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_ct = await crud.get_client_type(session, ct_id)
    if not db_ct:
        raise HTTPException(status_code=404, detail="Client type not found")
    from sqlmodel import select
    res = await session.execute(select(ClientType).where(ClientType.name == ct_in.name, ClientType.id != ct_id))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Client type with this name already exists")
    old_name = db_ct.name
    db_ct.name = ct_in.name
    session.add(db_ct)
    await session.commit()
    await session.refresh(db_ct)
    await crud.create_audit_log(session, current_user.username, "UPDATE_CLIENT_TYPE", f"Renamed client type from {old_name} to {db_ct.name}")
    return db_ct

# Region Endpoints
@router.get("/regions", response_model=List[schemas.RegionOut], dependencies=[Depends(deps.has_permission("manage_metadata"))])
async def read_regions(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_regions(session)

@router.post("/regions", response_model=schemas.RegionOut)
async def create_region_route(
    r_in: schemas.RegionCreate,
    current_user: User = Depends(deps.has_permission("manage_metadata")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    from sqlmodel import select
    res = await session.execute(select(Region).where(Region.name == r_in.name))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Region already exists")
    db_r = await crud.create_region(session, r_in)
    await crud.create_audit_log(session, current_user.username, "CREATE_REGION", f"Created region: {db_r.name}")
    return db_r

@router.delete("/regions/{r_id}")
async def delete_region_route(
    r_id: int,
    current_user: User = Depends(deps.has_permission("manage_metadata")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_r = await crud.get_region(session, r_id)
    if not db_r:
        raise HTTPException(status_code=404, detail="Region not found")
    name = db_r.name
    await session.delete(db_r)
    await session.commit()
    await crud.create_audit_log(session, current_user.username, "DELETE_REGION", f"Deleted region: {name}")
    return {"success": True}

@router.put("/regions/{r_id}", response_model=schemas.RegionOut)
async def update_region_route(
    r_id: int,
    r_in: schemas.RegionCreate,
    current_user: User = Depends(deps.has_permission("manage_metadata")),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_r = await crud.get_region(session, r_id)
    if not db_r:
        raise HTTPException(status_code=404, detail="Region not found")
    from sqlmodel import select
    res = await session.execute(select(Region).where(Region.name == r_in.name, Region.id != r_id))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Region with this name already exists")
    old_name = db_r.name
    db_r.name = r_in.name
    session.add(db_r)
    await session.commit()
    await session.refresh(db_r)
    await crud.create_audit_log(session, current_user.username, "UPDATE_REGION", f"Renamed region from {old_name} to {db_r.name}")
    return db_r

# Surveys Endpoints
@router.post("/surveys", response_model=schemas.SurveyOut)
async def create_survey_route(
    survey_in: schemas.SurveyCreate,
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_survey = await crud.create_survey(session, survey_in)
    
    # Broadcast new survey to WebSocket clients
    # Assign random nearby campus coordinates if missing (so the map has pins)
    import random
    lat = db_survey.latitude
    lng = db_survey.longitude
    if not lat or not lng:
        lat = round(random.uniform(7.122, 7.128), 6)
        lng = round(random.uniform(124.838, 124.846), 6)
        
    await manager.broadcast({
        "type": "NEW_SURVEY",
        "survey": {
            "id": db_survey.id,
            "client_type": db_survey.client_type,
            "region": db_survey.region,
            "created_on": db_survey.created_on.isoformat() if db_survey.created_on else None,
            "latitude": lat,
            "longitude": lng,
            "sqd0": db_survey.sqd0,
            "suggestions": db_survey.suggestions,
            "transaction_types": db_survey.transaction_types or {}
        }
    })
    
    return db_survey


@router.websocket("/surveys/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/surveys", response_model=List[schemas.SurveyOut], dependencies=[Depends(deps.has_permission("view_monitor"))])
async def read_surveys(
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_surveys(session, scoped_user_id=current_user.id)

@router.get("/surveys/stats", response_model=schemas.DashboardStats, dependencies=[Depends(deps.allow_dashboard)])
async def read_survey_stats(
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    stats = await crud.get_dashboard_stats(session, current_user)
    return stats


from typing import Optional
from fastapi.responses import StreamingResponse
from datetime import datetime
import csv
import io
from sqlmodel import select, func
from app.models.models import ClientSurvey, SurveyServiceLink, User, OrganizationNode

async def get_filtered_surveys(
    session: AsyncSession,
    current_user: User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    org_node_id: Optional[int] = None,
    client_type: Optional[str] = None,
    region: Optional[str] = None,
    service_id: Optional[int] = None,
):
    stmt = select(ClientSurvey)
    
    # 1. Apply user level scoping (Unit scoping)
    user_level_lower = current_user.user_level.lower() if current_user.user_level else ""
    is_scoped = user_level_lower == "unit" and current_user.org_node_id is not None
    
    if is_scoped:
        descendant_ids = await crud.get_node_descendants(session, current_user.org_node_id)
        users_stmt = select(User.id).where(User.org_node_id.in_(list(descendant_ids)))
        res_users = await session.execute(users_stmt)
        scoped_user_ids = res_users.scalars().all()
        stmt = stmt.where(ClientSurvey.evaluator_user_id.in_(scoped_user_ids))
        
    # 2. Optional Filters
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            stmt = stmt.where(ClientSurvey.created_on >= sd)
        except ValueError:
            pass
            
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d")
            ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
            stmt = stmt.where(ClientSurvey.created_on <= ed)
        except ValueError:
            pass
            
    if org_node_id:
        descendant_ids = await crud.get_node_descendants(session, org_node_id)
        users_stmt = select(User.id).where(User.org_node_id.in_(list(descendant_ids)))
        res_users = await session.execute(users_stmt)
        node_user_ids = res_users.scalars().all()
        stmt = stmt.where(ClientSurvey.evaluator_user_id.in_(node_user_ids))
        
    if client_type:
        stmt = stmt.where(ClientSurvey.client_type == client_type)
        
    if region:
        stmt = stmt.where(ClientSurvey.region == region)
        
    if service_id:
        stmt = stmt.join(SurveyServiceLink, SurveyServiceLink.survey_id == ClientSurvey.id).where(SurveyServiceLink.service_id == service_id)
        
    stmt = stmt.order_by(ClientSurvey.created_on.desc())
    res = await session.execute(stmt)
    return res.scalars().all()


@router.get("/surveys/analytics", dependencies=[Depends(deps.has_permission("view_analytics"))])
async def get_survey_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    org_node_id: Optional[int] = None,
    client_type: Optional[str] = None,
    region: Optional[str] = None,
    service_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    surveys = await get_filtered_surveys(
        session, current_user, start_date, end_date, org_node_id, client_type, region, service_id
    )
    
    total = len(surveys)
    
    # Average rating
    total_val = 0.0
    total_count = 0
    for s in surveys:
        for field in ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8']:
            val = getattr(s, field)
            if val and val > 0:
                total_val += val
                total_count += 1
    avg_rating = round(total_val / total_count, 2) if total_count > 0 else 5.0
    
    # CSAT Score
    csat_4_5_count = 0
    csat_total_count = 0
    for s in surveys:
        val = s.sqd0
        if val and val > 0:
            csat_total_count += 1
            if val >= 4:
                csat_4_5_count += 1
    csat_score = round(csat_4_5_count / csat_total_count * 100, 1) if csat_total_count > 0 else 100.0
    
    # NPS Sentiment
    promoters = 0
    passives = 0
    detractors = 0
    nps_total = 0
    for s in surveys:
        val = s.sqd0
        if val and val > 0:
            nps_total += 1
            if val >= 4:
                promoters += 1
            elif val == 3:
                passives += 1
            else:
                detractors += 1
    promoter_pct = round(promoters / nps_total * 100, 1) if nps_total > 0 else 100.0
    passive_pct = round(passives / nps_total * 100, 1) if nps_total > 0 else 0.0
    detractor_pct = round(detractors / nps_total * 100, 1) if nps_total > 0 else 0.0
    
    # Demographics
    sex_dist = {}
    client_type_dist = {}
    region_dist = {}
    age_groups = {"Under 18": 0, "18-24": 0, "25-34": 0, "35-50": 0, "50+": 0}
    
    for s in surveys:
        sex = s.sex or "Unknown"
        sex_dist[sex] = sex_dist.get(sex, 0) + 1
        
        ct = s.client_type or "Unknown"
        client_type_dist[ct] = client_type_dist.get(ct, 0) + 1
        
        reg = s.region or "Unknown"
        region_dist[reg] = region_dist.get(reg, 0) + 1
        
        age = s.age
        if age:
            if age < 18:
                age_groups["Under 18"] += 1
            elif age <= 24:
                age_groups["18-24"] += 1
            elif age <= 34:
                age_groups["25-34"] += 1
            elif age <= 50:
                age_groups["35-50"] += 1
            else:
                age_groups["50+"] += 1
                
    # Citizen Charter
    cc1_dist = {"1": 0, "2": 0, "3": 0, "4": 0}
    cc2_dist = {"1": 0, "2": 0, "3": 0, "4": 0}
    cc3_dist = {"1": 0, "2": 0, "3": 0, "4": 0}
    
    for s in surveys:
        if s.cc1 in cc1_dist:
            cc1_dist[s.cc1] += 1
        if s.cc2 in cc2_dist:
            cc2_dist[s.cc2] += 1
        if s.cc3 in cc3_dist:
            cc3_dist[s.cc3] += 1
            
    # SQD Breakdown
    sqd_breakdown = []
    labels = [
        "SQD0 - General Satisfaction",
        "SQD1 - Responsiveness",
        "SQD2 - Reliability",
        "SQD3 - Access & Facilities",
        "SQD4 - Communication",
        "SQD5 - Costs",
        "SQD6 - Integrity",
        "SQD7 - Assurance",
        "SQD8 - Outcome"
    ]
    for i in range(9):
        field = f'sqd{i}'
        field_vals = [getattr(s, field) for s in surveys if getattr(s, field) and getattr(s, field) > 0]
        avg = round(sum(field_vals) / len(field_vals), 2) if field_vals else 5.0
        pct = round((avg / 5.0) * 100, 1)
        sqd_breakdown.append({
            "label": labels[i],
            "avg": avg,
            "pct": pct
        })
        
    # Timeline
    timeline = {}
    for s in surveys:
        if s.created_on:
            date_str = s.created_on.strftime("%Y-%m-%d")
            timeline[date_str] = timeline.get(date_str, 0) + 1
    sorted_timeline = {k: timeline[k] for k in sorted(timeline.keys())}
    
    # Suggestions
    suggestions = []
    for s in surveys:
        if s.suggestions and s.suggestions.strip():
            suggestions.append({
                "id": s.id,
                "created_on": s.created_on.strftime("%Y-%m-%d %H:%M:%S") if s.created_on else None,
                "client_type": s.client_type,
                "email": s.email or "N/A",
                "suggestions": s.suggestions
            })
            
    return {
        "total_surveys": total,
        "average_rating": avg_rating,
        "csat_score": csat_score,
        "nps_sentiment": {
            "promoter_pct": promoter_pct,
            "passive_pct": passive_pct,
            "detractor_pct": detractor_pct
        },
        "demographics": {
            "sex": sex_dist,
            "client_type": client_type_dist,
            "region": region_dist,
            "age_groups": age_groups
        },
        "citizen_charter": {
            "cc1": cc1_dist,
            "cc2": cc2_dist,
            "cc3": cc3_dist
        },
        "sqd_breakdown": sqd_breakdown,
        "timeline_trend": sorted_timeline,
        "suggestions": suggestions[:100]
    }


@router.get("/surveys/export", dependencies=[Depends(deps.allow_dashboard)])
async def export_surveys_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    org_node_id: Optional[int] = None,
    client_type: Optional[str] = None,
    region: Optional[str] = None,
    service_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> StreamingResponse:
    surveys = await get_filtered_surveys(
        session, current_user, start_date, end_date, org_node_id, client_type, region, service_id
    )
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Transaction ID", "Date Submitted", "Client Type", "Region", "Sex", "Age",
        "CC1", "CC2", "CC3",
        "SQD0 - General", "SQD1 - Responsiveness", "SQD2 - Reliability",
        "SQD3 - Access", "SQD4 - Communication", "SQD5 - Costs",
        "SQD6 - Integrity", "SQD7 - Assurance", "SQD8 - Outcome",
        "Suggestions/Feedback", "Email", "Services Evaluated"
    ])
    
    for s in surveys:
        txs = s.transaction_types or {}
        services_list = list(txs.values()) if isinstance(txs, dict) else []
        services_str = ", ".join(services_list)
        
        writer.writerow([
            s.transaction_id,
            s.created_on.strftime("%Y-%m-%d %H:%M:%S") if s.created_on else "",
            s.client_type,
            s.region,
            s.sex,
            s.age,
            s.cc1,
            s.cc2,
            s.cc3,
            s.sqd0 or "",
            s.sqd1 or "",
            s.sqd2 or "",
            s.sqd3 or "",
            s.sqd4 or "",
            s.sqd5 or "",
            s.sqd6 or "",
            s.sqd7 or "",
            s.sqd8 or "",
            s.suggestions or "",
            s.email or "",
            services_str
        ])
        
    output.seek(0)
    
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=survey_responses.csv"
    return response


@router.get("/surveys/personnel-stats", dependencies=[Depends(deps.has_permission("view_personnel_monitor"))])
async def get_personnel_stats(
    scope_type: str = "all",
    target_id: Optional[int] = None,
    time_group: str = "monthly",
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    # 1. Resolve evaluator IDs based on scope and target node
    evaluator_ids = []
    
    # Simple recursive descendant ID fetcher
    async def get_descendant_ids(node_id: int) -> List[int]:
        descendants = [node_id]
        to_check = [node_id]
        for _ in range(8):
            if not to_check:
                break
            q = select(OrganizationNode.id).where(OrganizationNode.parent_id.in_(to_check))
            res = await session.execute(q)
            children = res.scalars().all()
            if not children:
                break
            descendants.extend(children)
            to_check = list(children)
        return descendants

    if scope_type == "individual":
        if target_id is not None:
            evaluator_ids = [target_id]
    elif scope_type in ["department", "unit", "branch"]:
        if target_id is not None:
            nodes = await get_descendant_ids(target_id)
            q_users = select(User.id).where(User.org_node_id.in_(nodes))
            res_users = await session.execute(q_users)
            evaluator_ids = list(res_users.scalars().all())
            if not evaluator_ids:
                evaluator_ids = [-9999]
                
    # Apply hierarchy coordinator restrictions for all roles aside from Super and Admin
    if current_user.user_level not in ["Super", "Admin"]:
        if current_user.org_node_id:
            allowed_nodes = await get_descendant_ids(current_user.org_node_id)
            q_allowed_users = select(User.id).where(User.org_node_id.in_(allowed_nodes))
            res_allowed_users = await session.execute(q_allowed_users)
            allowed_users_list = list(res_allowed_users.scalars().all())
            
            if scope_type == "all":
                evaluator_ids = allowed_users_list
            else:
                evaluator_ids = [uid for uid in evaluator_ids if uid in allowed_users_list]
                if not evaluator_ids:
                    evaluator_ids = [-9999]
        else:
            # If not assigned to any node, they can't see anyone (or only themselves)
            if scope_type == "all":
                evaluator_ids = [current_user.id]
            else:
                evaluator_ids = [uid for uid in evaluator_ids if uid == current_user.id]
                if not evaluator_ids:
                    evaluator_ids = [-9999]

    # 2. Fetch surveys
    query = select(ClientSurvey)
    if scope_type != "all" or current_user.user_level not in ["Super", "Admin"]:
        query = query.where(ClientSurvey.evaluator_user_id.in_(evaluator_ids))
        
    res = await session.execute(query)
    surveys = res.scalars().all()

    # 3. Sentiment Analysis Lexicon scoring
    POSITIVE_WORDS = {
        "excellent", "good", "great", "fast", "quick", "polite", "friendly", 
        "helpful", "accommodating", "satisfied", "satisfactory", "outstanding", 
        "clean", "clear", "efficient", "well", "happy", "smooth", "best", "perfect", "guided"
    }
    NEGATIVE_WORDS = {
        "slow", "bad", "queue", "unclear", "rude", "delayed", "delay", "poor", 
        "unsatisfactory", "warm", "hot", "ac", "wait", "long", "aircon", "broken", 
        "confusing", "lost", "dirty", "worst", "unhelpful", "difficult", "improvement"
    }

    pos_count = 0
    neg_count = 0
    neu_count = 0
    sentiment_feed = []

    for s in surveys:
        if s.suggestions:
            words = s.suggestions.lower().replace(".", " ").replace(",", " ").replace("!", " ").split()
            pos_w = sum(1 for w in words if w in POSITIVE_WORDS)
            neg_w = sum(1 for w in words if w in NEGATIVE_WORDS)
            
            if pos_w > neg_w:
                sentiment = "positive"
                pos_count += 1
            elif neg_w > pos_w:
                sentiment = "negative"
                neg_count += 1
            else:
                sentiment = "neutral"
                neu_count += 1
                
            sentiment_feed.append({
                "id": s.id,
                "suggestions": s.suggestions,
                "sentiment": sentiment,
                "created_on": s.created_on.isoformat() if s.created_on else None,
                "client_type": s.client_type
            })

    # 4. Group by timeline period
    import collections
    period_data = collections.defaultdict(list)
    for s in surveys:
        if not s.created_on:
            continue
        if time_group == "daily":
            key = s.created_on.strftime("%Y-%m-%d")
        elif time_group == "weekly":
            key = s.created_on.strftime("%Y-W%W")
        elif time_group == "yearly":
            key = s.created_on.strftime("%Y")
        else: # monthly
            key = s.created_on.strftime("%Y-%m")
        period_data[key].append(s)

    sorted_keys = sorted(period_data.keys())
    timeline = []
    for key in sorted_keys:
        items = period_data[key]
        sum_rating = 0
        rating_count = 0
        satisfied = 0
        
        for item in items:
            ratings = [getattr(item, f"sqd{j}") for j in range(9) if getattr(item, f"sqd{j}") is not None]
            if ratings:
                sum_rating += sum(ratings) / len(ratings)
                rating_count += 1
            if item.sqd0 is not None and item.sqd0 >= 4:
                satisfied += 1
                
        avg_val = round(sum_rating / rating_count, 2) if rating_count > 0 else 5.0
        csat_val = round((satisfied / len(items)) * 100, 1) if items else 100.0
        
        timeline.append({
            "period": key,
            "avg_rating": avg_val,
            "csat": csat_val,
            "count": len(items)
        })

    # 5. Linear Regression Trend Forecasting
    n = len(timeline)
    predicted_rating = 5.0
    predicted_csat = 100.0
    prediction_msg = "No predictions available yet. Feed more data."
    trend_direction = "stable"
    trend_pct = 0.0

    if n >= 2:
        x_vals = list(range(1, n + 1))
        y_rating = [t["avg_rating"] for t in timeline]
        y_csat = [t["csat"] for t in timeline]
        
        mean_x = sum(x_vals) / n
        mean_yr = sum(y_rating) / n
        mean_yc = sum(y_csat) / n
        
        num_r = sum((x_vals[i] - mean_x) * (y_rating[i] - mean_yr) for i in range(n))
        num_c = sum((x_vals[i] - mean_x) * (y_csat[i] - mean_yc) for i in range(n))
        den = sum((x_vals[i] - mean_x) ** 2 for i in range(n))
        
        m_r = num_r / den if den != 0 else 0
        c_r = mean_yr - m_r * mean_x
        
        m_c = num_c / den if den != 0 else 0
        c_c = mean_yc - m_c * mean_x
        
        next_x = n + 1
        predicted_rating = round(max(1.0, min(5.0, m_r * next_x + c_r)), 2)
        predicted_csat = round(max(0.0, min(100.0, m_c * next_x + c_c)), 1)
        
        last_rating = y_rating[-1]
        if last_rating > 0:
            trend_pct = round(((predicted_rating - last_rating) / last_rating) * 100, 1)
            
        if trend_pct > 0.5:
            trend_direction = "up"
            prediction_msg = f"Projected rating is trending UP by {trend_pct}% for the next period."
        elif trend_pct < -0.5:
            trend_direction = "down"
            prediction_msg = f"Projected rating is trending DOWN by {abs(trend_pct)}% for the next period. Bottleneck warnings active."
        else:
            prediction_msg = "Projected rating remains stable for the next period."

    # Calculate average rating per SQD dimension
    sqd_sums = [0.0] * 9
    sqd_counts = [0] * 9
    for s in surveys:
        for j in range(9):
            val = getattr(s, f"sqd{j}")
            if val is not None and val > 0:
                sqd_sums[j] += val
                sqd_counts[j] += 1
                
    sqd_averages = []
    labels = [
        "General Satisfaction", "Responsiveness", "Reliability", 
        "Access & Facilities", "Communication", "Costs Integrity", 
        "Process Integrity", "Assurance", "Service Outcome"
    ]
    for j in range(9):
        avg_val = round(sqd_sums[j] / sqd_counts[j], 2) if sqd_counts[j] > 0 else 5.0
        sqd_averages.append({
            "dimension": f"SQD{j}",
            "label": labels[j],
            "average": avg_val
        })

    # Tally survey counts per transaction service
    service_counts = collections.Counter()
    for s in surveys:
        txs = s.transaction_types or {}
        if isinstance(txs, dict):
            for name in txs.values():
                service_counts[name] += 1
                
    service_stats = [
        {"service_name": name, "count": count}
        for name, count in service_counts.most_common()
    ]

    return {
        "scope_type": scope_type,
        "target_id": target_id,
        "time_group": time_group,
        "summary": {
            "total_surveys": len(surveys),
            "sentiment": {
                "positive": pos_count,
                "negative": neg_count,
                "neutral": neu_count
            },
            "predictive": {
                "predicted_rating": predicted_rating,
                "predicted_csat": predicted_csat,
                "trend": trend_direction,
                "trend_pct": trend_pct,
                "message": prediction_msg
            },
            "sqd_averages": sqd_averages,
            "service_stats": service_stats
        },
        "timeline": timeline,
        "sentiment_feed": sentiment_feed[:20]
    }


@router.get("/surveys/personnel-responses", response_model=List[schemas.SurveyOut], dependencies=[Depends(deps.has_permission("view_personnel_responses"))])
async def get_personnel_responses(
    evaluator_user_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    service_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    # 1. Verify coordinator bounds for non-Super/Admin roles
    if current_user.user_level not in ["Super", "Admin"]:
        if current_user.org_node_id:
            # Find descendants recursively
            start_node = current_user.org_node_id
            descendant_nodes = [start_node]
            to_check = [start_node]
            for _ in range(8):
                if not to_check:
                    break
                q = select(OrganizationNode.id).where(OrganizationNode.parent_id.in_(to_check))
                res = await session.execute(q)
                children = res.scalars().all()
                if not children:
                    break
                descendant_nodes.extend(children)
                to_check = list(children)
            
            # Verify target evaluator user belongs to these descendant nodes
            q_val = select(User.id).where(User.id == evaluator_user_id).where(User.org_node_id.in_(descendant_nodes))
            res_val = await session.execute(q_val)
            is_valid = res_val.scalar_one_or_none()
            if not is_valid and evaluator_user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized to view responses for this personnel.")
        else:
            if evaluator_user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Coordinator not linked to any organizational node.")

    # 2. Build Query
    query = select(ClientSurvey).where(ClientSurvey.evaluator_user_id == evaluator_user_id)
    
    from datetime import datetime
    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.where(ClientSurvey.created_on >= sd)
        except ValueError:
            pass
            
    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.where(ClientSurvey.created_on < ed)
        except ValueError:
            pass

    # Filter by service ID link if requested
    if service_id:
        from app.models.models import SurveyServiceLink
        query = query.join(SurveyServiceLink, ClientSurvey.id == SurveyServiceLink.survey_id).where(SurveyServiceLink.service_id == service_id)

    # Order newest first
    query = query.order_by(ClientSurvey.created_on.desc())
    
    res = await session.execute(query)
    return res.scalars().all()


@router.get("/surveys/personnel-ratings", dependencies=[Depends(deps.has_any_permission(["view_personnel_monitor", "view_personnel_responses"]))])
async def get_personnel_ratings(
    session: AsyncSession = Depends(get_session)
) -> Any:
    from sqlalchemy import func
    q = select(ClientSurvey.evaluator_user_id, func.avg(ClientSurvey.sqd0)).group_by(ClientSurvey.evaluator_user_id)
    res = await session.execute(q)
    rows = res.all()
    return {
        str(row[0]): round(float(row[1]), 2)
        for row in rows
        if row[0] is not None
    }




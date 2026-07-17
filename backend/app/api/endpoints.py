import os
from datetime import timedelta
from typing import Any, List
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.security import create_access_token, verify_password, get_password_hash
from app.api import deps
from app.crud import crud
from app.models.models import User, UserLevel, NodeType, OrganizationNode, ClientType, Region
from app.schemas import schemas

router = APIRouter()

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
    user = await crud.get_user_by_username(session, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        # We can optionally log failed logins
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password"
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
    await crud.create_audit_log(session, current_user.username, "CREATE_ORG_NODE", f"Created organizational node: {db_node.name} ({db_node.node_type})")
    return db_node

@router.get("/org-nodes", response_model=List[schemas.OrgNodeOut], dependencies=[Depends(deps.allow_dashboard)])
async def read_org_nodes(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_org_nodes(session)

@router.get("/org-nodes/tree", response_model=List[schemas.OrgNodeTreeOut], dependencies=[Depends(deps.allow_dashboard)])
async def read_org_node_tree(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_org_node_tree(session)

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
        
    node_data = node_in.model_dump(exclude_unset=True)
    for key, value in node_data.items():
        setattr(db_node, key, value)
        
    session.add(db_node)
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
    
    await crud.create_audit_log(
        session, 
        current_user.username, 
        "CREATE_USER", 
        f"Created user account: {db_user.username} (Level: {db_user.user_level})"
    )
    return db_user

@router.get("/users", response_model=List[schemas.UserOut], dependencies=[Depends(deps.has_permission("manage_users"))])
async def read_users(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_users(session)

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
    current_user: User = Depends(deps.has_permission("manage_users"))
) -> Any:
    return await crud.get_roles(session)

@router.post("/roles", response_model=schemas.RoleOut)
async def create_role_route(
    r_in: schemas.RoleCreate,
    current_user: User = Depends(deps.has_permission("manage_users")),
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
    current_user: User = Depends(deps.has_permission("manage_users")),
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
    current_user: User = Depends(deps.has_permission("manage_users")),
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
    return await crud.create_survey(session, survey_in)

@router.get("/surveys", response_model=List[schemas.SurveyOut], dependencies=[Depends(deps.allow_dashboard)])
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

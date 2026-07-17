import os
from datetime import timedelta
from typing import Any, List
import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.security import create_access_token, verify_password, get_password_hash
from app.api import deps
from app.crud import crud
from app.models.models import User, UserLevel, NodeType, OrganizationNode
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
    session: AsyncSession = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = await crud.get_user_by_username(session, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
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
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/auth/me", response_model=schemas.UserOut)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    return current_user

# Organization Nodes Endpoints
@router.post("/org-nodes", response_model=schemas.OrgNodeOut, dependencies=[Depends(deps.allow_admin)])
async def create_org_node_route(
    node_in: schemas.OrgNodeCreate,
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.create_org_node(session, node_in)

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

@router.put("/org-nodes/{node_id}", response_model=schemas.OrgNodeOut, dependencies=[Depends(deps.allow_admin)])
async def update_org_node(
    node_id: int,
    node_in: schemas.OrgNodeUpdate,
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
    return db_node

@router.delete("/org-nodes/{node_id}", dependencies=[Depends(deps.allow_admin)])
async def delete_org_node(
    node_id: int,
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_node = await session.get(OrganizationNode, node_id)
    if not db_node:
        raise HTTPException(status_code=404, detail="Node not found")
    await session.delete(db_node)
    await session.commit()
    return {"success": True}

# Services Endpoints
@router.post("/services", response_model=schemas.ServiceOut, dependencies=[Depends(deps.allow_admin)])
async def create_service_route(
    service_in: schemas.ServiceCreate,
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.create_service(session, service_in)

@router.get("/services", response_model=List[schemas.ServiceOut])
async def read_services(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_services(session)

@router.put("/services/{service_id}", response_model=schemas.ServiceOut, dependencies=[Depends(deps.allow_admin)])
async def update_service_route(
    service_id: int,
    service_in: schemas.ServiceCreate,
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
    return db_service

@router.delete("/services/{service_id}", dependencies=[Depends(deps.allow_admin)])
async def delete_service_route(
    service_id: int,
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_service = await crud.get_service(session, service_id)
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    await session.delete(db_service)
    await session.commit()
    return {"success": True}

# Questions Endpoints
@router.post("/questions", response_model=schemas.QuestionOut, dependencies=[Depends(deps.allow_admin)])
async def create_question_route(
    question_in: schemas.QuestionCreate,
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.create_question(session, question_in)

@router.get("/questions", response_model=List[schemas.QuestionOut])
async def read_questions(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_questions(session)

# Users Endpoints
@router.post("/users", response_model=schemas.UserOut, dependencies=[Depends(deps.allow_admin)])
async def create_user_route(
    user_in: schemas.UserCreate,
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
    return db_user

@router.get("/users", response_model=List[schemas.UserOut], dependencies=[Depends(deps.allow_dashboard)])
async def read_users(
    session: AsyncSession = Depends(get_session)
) -> Any:
    return await crud.get_users(session)

@router.get("/users/public/{identifier}", response_model=schemas.UserOut)
async def read_user_public(
    identifier: str,
    session: AsyncSession = Depends(get_session)
) -> Any:
    # First try resolving by UUID
    db_user = await crud.get_user_by_uuid(session, identifier)
    if not db_user:
        # Fallback to username for compatibility with existing QR codes
        db_user = await crud.get_user_by_username(session, identifier)
        
    if not db_user or not db_user.is_active:
        raise HTTPException(status_code=404, detail="Officer profile not found")
    return db_user

@router.delete("/users/{user_id}", dependencies=[Depends(deps.allow_admin)])
async def delete_user(
    user_id: int,
    current_user: User = Depends(deps.get_current_user),
    session: AsyncSession = Depends(get_session)
) -> Any:
    db_user = await crud.get_user(session, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent Admin from deleting Super
    if current_user.user_level == UserLevel.ADMIN and db_user.user_level == UserLevel.SUPER:
        raise HTTPException(status_code=403, detail="Admin level users cannot delete Super level accounts")
        
    await session.delete(db_user)
    await session.commit()
    return {"success": True}

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

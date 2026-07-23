from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlmodel import text
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.models.models import User, UserLevel
from app.schemas.schemas import TokenPayload
from app.crud import crud

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    session: AsyncSession = Depends(get_session),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = await crud.get_user(session, user_id=int(token_data.sub))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

class RoleChecker:
    def __init__(self, allowed_roles: list[UserLevel]):
        self.allowed_roles = [r.value.lower() if hasattr(r, "value") else str(r).lower() for r in allowed_roles]

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        user_role = user.user_level.lower() if user.user_level else ""
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges"
            )
        return user

# Super/Admin only permission guard
allow_admin = RoleChecker([UserLevel.SUPER, UserLevel.ADMIN])

# Super/Admin/Unit dashboard permission guard
allow_dashboard = RoleChecker([UserLevel.SUPER, UserLevel.ADMIN, UserLevel.UNIT])

class PermissionChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    async def __call__(self, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> User:
        user_role = user.user_level.lower() if user.user_level else ""
        # Super level users have all privileges implicitly
        if user_role == "super":
            return user
            
        # Resolve role permissions
        role_permissions = []
        if user.user_level:
            from app.models.models import Role
            from sqlmodel import select
            # Check case-insensitively or exact match
            res = await session.execute(select(Role).where(text("LOWER(name) = :name")).params(name=user_role))
            role = res.scalar_one_or_none()
            if role and role.permissions:
                role_permissions = role.permissions
            
        # Combine role permissions + user-specific overrides
        user_perms = set(role_permissions) | set(user.permissions or [])
        if self.required_permission not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The user doesn't have the '{self.required_permission}' permission"
            )
        return user

def has_permission(permission_name: str) -> PermissionChecker:
    return PermissionChecker(permission_name)

class AnyPermissionChecker:
    def __init__(self, permissions: list[str]):
        self.permissions = permissions

    async def __call__(self, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> User:
        user_role = user.user_level.lower() if user.user_level else ""
        if user_role == "super":
            return user
            
        role_permissions = []
        if user.user_level:
            from app.models.models import Role
            from sqlmodel import select
            res = await session.execute(select(Role).where(text("LOWER(name) = :name")).params(name=user_role))
            role = res.scalar_one_or_none()
            if role and role.permissions:
                role_permissions = role.permissions
                
        user_perms = set(role_permissions) | set(user.permissions or [])
        if not any(p in user_perms for p in self.permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The user doesn't have any of the required permissions: {self.permissions}"
            )
        return user

def has_any_permission(permission_names: list[str]) -> AnyPermissionChecker:
    return AnyPermissionChecker(permission_names)

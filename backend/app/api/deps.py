from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
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
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.user_level not in self.allowed_roles:
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
        # Super level users have all permissions implicitly
        if user.user_level == UserLevel.SUPER or user.user_level == "Super":
            return user
            
        # Resolve role permissions
        role_permissions = []
        if user.user_level:
            from app.models.models import Role
            from sqlmodel import select
            # User level can be a string or enum
            level_str = user.user_level.value if hasattr(user.user_level, "value") else str(user.user_level)
            res = await session.execute(select(Role).where(Role.name == level_str))
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

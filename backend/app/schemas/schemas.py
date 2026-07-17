from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from app.models.models import NodeType, UserLevel

# Auth Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    id_number: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[str] = None
    contact_no: Optional[str] = None
    user_level: UserLevel = UserLevel.CLIENT
    org_node_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    id_number: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[str] = None
    contact_no: Optional[str] = None
    user_level: Optional[UserLevel] = None
    org_node_id: Optional[int] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    uuid: str
    picture_url: Optional[str] = None
    qrcode_image_url: Optional[str] = None
    qrcode_payload: Optional[str] = None
    registered_on: datetime

    class Config:
        from_attributes = True

# Organization Node Schemas
class OrgNodeBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    address: Optional[str] = None
    node_type: NodeType
    parent_id: Optional[int] = None
    metadata_info: Optional[Dict[str, Any]] = None

class OrgNodeCreate(OrgNodeBase):
    pass

class OrgNodeUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    address: Optional[str] = None
    node_type: Optional[NodeType] = None
    parent_id: Optional[int] = None
    metadata_info: Optional[Dict[str, Any]] = None

class OrgNodeOut(OrgNodeBase):
    id: int

    class Config:
        from_attributes = True

class OrgNodeTreeOut(OrgNodeOut):
    children: List["OrgNodeTreeOut"] = []

    class Config:
        from_attributes = True

# Service Schemas
class ServiceBase(BaseModel):
    service_name: str
    service_no: int = 0
    service_type: str = "Internal"
    service_time: Optional[str] = None
    service_is_payment: bool = False
    org_node_id: Optional[int] = None

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    service_name: Optional[str] = None
    service_no: Optional[int] = None
    service_type: Optional[str] = None
    service_time: Optional[str] = None
    service_is_payment: Optional[bool] = None
    org_node_id: Optional[int] = None

class ServiceOut(ServiceBase):
    id: int

    class Config:
        from_attributes = True

# Question Schemas
class QuestionBase(BaseModel):
    question_id: str
    question_question: str
    question_type: str = "General"

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    question_question: Optional[str] = None
    question_type: Optional[str] = None

class QuestionOut(QuestionBase):
    id: int

    class Config:
        from_attributes = True

# Survey Schemas
class SurveyCreate(BaseModel):
    evaluator_user_id: Optional[int] = None
    client_type: str
    region: str
    sex: str
    age: int
    cc1: str
    cc2: str
    cc3: str
    transaction_types: List[str] = []
    suggestions: Optional[str] = None
    email: Optional[EmailStr] = None
    others: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    sqd0: Optional[int] = None
    sqd1: Optional[int] = None
    sqd2: Optional[int] = None
    sqd3: Optional[int] = None
    sqd4: Optional[int] = None
    sqd5: Optional[int] = None
    sqd6: Optional[int] = None
    sqd7: Optional[int] = None
    sqd8: Optional[int] = None
    
    service_ids: List[int] = []

class SurveyOut(BaseModel):
    id: int
    transaction_id: str
    evaluator_user_id: Optional[int] = None
    client_type: str
    region: str
    sex: str
    age: int
    cc1: str
    cc2: str
    cc3: str
    transaction_types: Dict[str, Any]
    suggestions: Optional[str] = None
    email: Optional[EmailStr] = None
    others: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sqd0: Optional[int] = None
    sqd1: Optional[int] = None
    sqd2: Optional[int] = None
    sqd3: Optional[int] = None
    sqd4: Optional[int] = None
    sqd5: Optional[int] = None
    sqd6: Optional[int] = None
    sqd7: Optional[int] = None
    sqd8: Optional[int] = None
    created_on: datetime

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_surveys: int
    average_rating: float
    users: int
    services: int
    units: Optional[int] = None
    departments: Optional[int] = None

# Metadata Schemas
class ClientTypeCreate(BaseModel):
    name: str

class ClientTypeOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class RegionCreate(BaseModel):
    name: str

class RegionOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

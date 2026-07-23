import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.postgresql import JSONB

class NodeType(str, Enum):
    BRANCH = "BRANCH"
    UNIT = "UNIT"
    DEPARTMENT = "DEPARTMENT"
    POSITION = "POSITION"

class UserLevel(str, Enum):
    SUPER = "Super"
    ADMIN = "Admin"
    BRANCH = "Branch"
    UNIT = "Unit"
    DEPARTMENT = "Department"
    POSITION = "Position"
    CLIENT = "Client"

class OrganizationNode(SQLModel, table=True):
    __tablename__ = "organization_nodes"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    short_name: Optional[str] = None
    address: Optional[str] = None
    node_type: str = Field(index=True)
    assigned_user_id: Optional[int] = Field(default=None, foreign_key="users.id", nullable=True)
    
    parent_id: Optional[int] = Field(default=None, foreign_key="organization_nodes.id")
    
    # Self-referencing relationships
    parent: Optional["OrganizationNode"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "OrganizationNode.id"}
    )
    children: List["OrganizationNode"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"lazy": "selectin"}
    )
    
    # JSONB field to store flexible configuration parameters
    metadata_info: Optional[dict] = Field(default_factory=dict, sa_column=Column(JSONB))

import uuid as uuid_pkg

def generate_uuid_str() -> str:
    return str(uuid_pkg.uuid4())

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    uuid: str = Field(default_factory=generate_uuid_str, unique=True, index=True)
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    id_number: Optional[str] = None
    sex: Optional[str] = None # M or F
    birth_date: Optional[str] = None
    contact_no: Optional[str] = None
    user_level: str = Field(default="Client")
    
    org_node_id: Optional[int] = Field(default=None, foreign_key="organization_nodes.id", nullable=True)
    
    picture_url: Optional[str] = None
    qrcode_image_url: Optional[str] = None
    qrcode_payload: Optional[str] = None
    is_active: bool = Field(default=True)
    registered_on: datetime = Field(default_factory=datetime.utcnow)
    permissions: Optional[List[str]] = Field(default_factory=list, sa_column=Column(JSONB))

class Service(SQLModel, table=True):
    __tablename__ = "services"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    org_node_id: Optional[int] = Field(default=None, foreign_key="organization_nodes.id", nullable=True)
    
    service_name: str
    service_no: int = Field(default=0)
    service_type: str = Field(default="Internal") # Internal, External, All
    service_time: Optional[str] = None
    service_is_payment: bool = Field(default=False)

class Question(SQLModel, table=True):
    __tablename__ = "questions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: str = Field(unique=True, index=True) # SQD0, CC1, etc.
    question_question: str
    question_type: str = Field(default="General") # General, Admin, Support, etc.

class SurveyServiceLink(SQLModel, table=True):
    __tablename__ = "survey_services_link"
    
    survey_id: int = Field(foreign_key="client_surveys.id", primary_key=True)
    service_id: int = Field(foreign_key="services.id", primary_key=True)

class ClientSurvey(SQLModel, table=True):
    __tablename__ = "client_surveys"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True)
    
    evaluator_user_id: Optional[int] = Field(default=None, foreign_key="users.id", nullable=True)
    
    client_type: str
    region: str
    sex: str
    age: int
    
    cc1: str
    cc2: str
    cc3: str
    
    transaction_types: Optional[dict] = Field(default_factory=dict, sa_column=Column(JSONB))
    suggestions: Optional[str] = None
    email: Optional[str] = None
    others: Optional[str] = None
    
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # ratings SQD0 to SQD8
    sqd0: Optional[int] = None
    sqd1: Optional[int] = None
    sqd2: Optional[int] = None
    sqd3: Optional[int] = None
    sqd4: Optional[int] = None
    sqd5: Optional[int] = None
    sqd6: Optional[int] = None
    sqd7: Optional[int] = None
    sqd8: Optional[int] = None
    
    created_on: datetime = Field(default_factory=datetime.utcnow)

class ClientType(SQLModel, table=True):
    __tablename__ = "client_types"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)

class Region(SQLModel, table=True):
    __tablename__ = "regions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    username: str = Field(index=True)
    action: str = Field(index=True)
    details: str
    ip_address: Optional[str] = None

class Permission(SQLModel, table=True):
    __tablename__ = "permissions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    label: str
    description: Optional[str] = None

class Role(SQLModel, table=True):
    __tablename__ = "roles"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    permissions: Optional[List[str]] = Field(default_factory=list, sa_column=Column(JSONB))

from typing import List, Optional, Set
import qrcode
from io import BytesIO
from sqlmodel import select, and_, or_, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import OrganizationNode, User, Service, Question, ClientSurvey, SurveyServiceLink, NodeType, UserLevel
from app.schemas.schemas import UserCreate, OrgNodeCreate, ServiceCreate, QuestionCreate, SurveyCreate
from app.core.security import get_password_hash
from app.core.config import settings

# Hierarchy Utilities
async def get_node_descendants(session: AsyncSession, node_id: int) -> Set[int]:
    """Recursively fetches all descendant node IDs (including the starting node_id)."""
    descendants = {node_id}
    
    # Simple recursive fetch since Postgres is local
    queue = [node_id]
    while queue:
        current_id = queue.pop(0)
        stmt = select(OrganizationNode.id).where(OrganizationNode.parent_id == current_id)
        res = await session.execute(stmt)
        child_ids = res.scalars().all()
        for c_id in child_ids:
            if c_id not in descendants:
                descendants.add(c_id)
                queue.append(c_id)
                
    return descendants

async def get_node_ancestors(session: AsyncSession, node_id: int) -> List[OrganizationNode]:
    """Fetches list of ancestors up to the root node."""
    ancestors = []
    current_id = node_id
    while current_id:
        stmt = select(OrganizationNode).where(OrganizationNode.id == current_id)
        res = await session.execute(stmt)
        node = res.scalar_one_or_none()
        if not node:
            break
        ancestors.append(node)
        current_id = node.parent_id
    return ancestors

async def get_unit_node_for_user(session: AsyncSession, user: User) -> Optional[OrganizationNode]:
    """Traverses ancestors to find the first UNIT node type."""
    if not user.org_node_id:
        return None
    ancestors = await get_node_ancestors(session, user.org_node_id)
    for ancestor in ancestors:
        if ancestor.node_type == NodeType.UNIT:
            return ancestor
    return None

# OrganizationNode CRUD
async def create_org_node(session: AsyncSession, node_in: OrgNodeCreate) -> OrganizationNode:
    db_node = OrganizationNode.model_validate(node_in)
    session.add(db_node)
    await session.commit()
    await session.refresh(db_node)
    return db_node

async def get_org_nodes(session: AsyncSession) -> List[OrganizationNode]:
    stmt = select(OrganizationNode).options(selectinload(OrganizationNode.children))
    res = await session.execute(stmt)
    return res.scalars().all()

async def get_org_node_tree(session: AsyncSession) -> List[OrganizationNode]:
    """Fetches root nodes and their children."""
    stmt = select(OrganizationNode).where(OrganizationNode.parent_id == None).options(
        selectinload(OrganizationNode.children)
    )
    res = await session.execute(stmt)
    return res.scalars().all()

# User CRUD
async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    hashed_pwd = get_password_hash(user_in.password)
    user_data = user_in.model_dump(exclude={"password"})
    
    db_user = User(**user_data, hashed_password=hashed_pwd)
    
    # Auto-generate QR code payload
    qrcode_payload = f"{settings.PUBLIC_BASE_URL.rstrip('/')}/survey/{user_in.username}"
    db_user.qrcode_payload = qrcode_payload
    db_user.qrcode_image_url = f"/media/qrcodes/{user_in.username}.png"
    
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user

async def get_user(session: AsyncSession, user_id: int) -> Optional[User]:
    stmt = select(User).where(User.id == user_id)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def get_user_by_username(session: AsyncSession, username: str) -> Optional[User]:
    stmt = select(User).where(User.username == username)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def get_users(session: AsyncSession) -> List[User]:
    stmt = select(User)
    res = await session.execute(stmt)
    return res.scalars().all()

# Service CRUD
async def create_service(session: AsyncSession, service_in: ServiceCreate) -> Service:
    db_service = Service.model_validate(service_in)
    session.add(db_service)
    await session.commit()
    await session.refresh(db_service)
    return db_service

async def get_services(session: AsyncSession) -> List[Service]:
    stmt = select(Service)
    res = await session.execute(stmt)
    return res.scalars().all()

# Question CRUD
async def create_question(session: AsyncSession, question_in: QuestionCreate) -> Question:
    db_question = Question.model_validate(question_in)
    session.add(db_question)
    await session.commit()
    await session.refresh(db_question)
    return db_question

async def get_questions(session: AsyncSession) -> List[Question]:
    stmt = select(Question)
    res = await session.execute(stmt)
    return res.scalars().all()

# ClientSurvey CRUD
async def create_survey(session: AsyncSession, survey_in: SurveyCreate) -> ClientSurvey:
    survey_data = survey_in.model_dump(exclude={"service_ids"})
    
    # Map transaction types Pydantic List to Postgres Dict
    transaction_dict = {str(i): t for i, t in enumerate(survey_in.transaction_types)}
    
    db_survey = ClientSurvey(**survey_data, transaction_types=transaction_dict)
    session.add(db_survey)
    await session.commit()
    await session.refresh(db_survey)
    
    # Save links to services evaluated
    for s_id in survey_in.service_ids:
        link = SurveyServiceLink(survey_id=db_survey.id, service_id=s_id)
        session.add(link)
    
    await session.commit()
    return db_survey

async def get_surveys(session: AsyncSession, scoped_user_id: Optional[int] = None) -> List[ClientSurvey]:
    stmt = select(ClientSurvey)
    if scoped_user_id:
        # Get users in scope
        user_stmt = select(User).where(User.id == scoped_user_id)
        res = await session.execute(user_stmt)
        user = res.scalar_one_or_none()
        
        if user and user.user_level == UserLevel.UNIT and user.org_node_id:
            # Traversed unit node descendants
            descendants = await get_node_descendants(session, user.org_node_id)
            
            # Find users inside descendant nodes
            users_stmt = select(User.id).where(User.org_node_id.in_(list(descendants)))
            res_users = await session.execute(users_stmt)
            scoped_user_ids = res_users.scalars().all()
            
            stmt = stmt.where(ClientSurvey.evaluator_user_id.in_(scoped_user_ids))
            
    res = await session.execute(stmt)
    return res.scalars().all()

async def get_dashboard_stats(session: AsyncSession, user: User) -> dict:
    # Set default scoping
    is_scoped = user.user_level == UserLevel.UNIT and user.org_node_id is not None
    descendant_ids = set()
    scoped_user_ids = []
    
    if is_scoped:
        descendant_ids = await get_node_descendants(session, user.org_node_id)
        users_stmt = select(User.id).where(User.org_node_id.in_(list(descendant_ids)))
        res_users = await session.execute(users_stmt)
        scoped_user_ids = res_users.scalars().all()
        
    # Count Surveys
    survey_count_stmt = select(func.count(ClientSurvey.id))
    if is_scoped:
        survey_count_stmt = survey_count_stmt.where(ClientSurvey.evaluator_user_id.in_(scoped_user_ids))
    survey_count = (await session.execute(survey_count_stmt)).scalar() or 0
    
    # Calculate Average Rating (SQD0 to SQD8 fields, ignoring 0 / N/A)
    # Get all matching surveys
    survey_stmt = select(ClientSurvey)
    if is_scoped:
        survey_stmt = survey_stmt.where(ClientSurvey.evaluator_user_id.in_(scoped_user_ids))
    res_surveys = await session.execute(survey_stmt)
    surveys = res_surveys.scalars().all()
    
    total_val = 0.0
    total_count = 0
    for s in surveys:
        for field in ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8']:
            val = getattr(s, field)
            if val and val > 0:
                total_val += val
                total_count += 1
                
    avg_rating = total_val / total_count if total_count > 0 else 5.0
    
    # Count Users
    user_count_stmt = select(func.count(User.id))
    if is_scoped:
        user_count_stmt = user_count_stmt.where(User.org_node_id.in_(list(descendant_ids)))
    user_count = (await session.execute(user_count_stmt)).scalar() or 0
    
    # Count Services
    service_count_stmt = select(func.count(Service.id))
    if is_scoped:
        service_count_stmt = service_count_stmt.where(Service.org_node_id.in_(list(descendant_ids)))
    service_count = (await session.execute(service_count_stmt)).scalar() or 0
    
    stats = {
        "total_surveys": survey_count,
        "average_rating": round(avg_rating, 2),
        "users": user_count,
        "services": service_count,
    }
    
    if user.user_level in [UserLevel.SUPER, UserLevel.ADMIN]:
        # Count Units (node_type = UNIT)
        unit_count_stmt = select(func.count(OrganizationNode.id)).where(OrganizationNode.node_type == NodeType.UNIT)
        stats["units"] = (await session.execute(unit_count_stmt)).scalar() or 0
        
        # Count Departments (node_type = DEPARTMENT)
        dept_count_stmt = select(func.count(OrganizationNode.id)).where(OrganizationNode.node_type == NodeType.DEPARTMENT)
        stats["departments"] = (await session.execute(dept_count_stmt)).scalar() or 0
        
    return stats

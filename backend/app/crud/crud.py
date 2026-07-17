from typing import List, Optional, Set
import qrcode
from io import BytesIO
from sqlmodel import select, and_, or_, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import OrganizationNode, User, Service, Question, ClientSurvey, SurveyServiceLink, NodeType, UserLevel, ClientType, Region
from app.schemas.schemas import UserCreate, OrgNodeCreate, ServiceCreate, QuestionCreate, SurveyCreate, ClientTypeCreate, RegionCreate
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
    """Fetches root nodes and their children recursively."""
    stmt = select(OrganizationNode).where(OrganizationNode.parent_id == None).options(
        selectinload(OrganizationNode.children)
        .selectinload(OrganizationNode.children)
        .selectinload(OrganizationNode.children)
        .selectinload(OrganizationNode.children)
    )
    res = await session.execute(stmt)
    return res.scalars().all()

# User CRUD
async def create_user(session: AsyncSession, user_in: UserCreate) -> User:
    hashed_pwd = get_password_hash(user_in.password)
    user_data = user_in.model_dump(exclude={"password"})
    
    db_user = User(**user_data, hashed_password=hashed_pwd)
    
    # Auto-generate QR code payload using UUID
    import uuid
    db_user.uuid = str(uuid.uuid4())
    qrcode_payload = f"{settings.PUBLIC_BASE_URL.rstrip('/')}/survey/{db_user.uuid}"
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

async def get_user_by_uuid(session: AsyncSession, user_uuid: str) -> Optional[User]:
    stmt = select(User).where(User.uuid == user_uuid)
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

async def get_service(session: AsyncSession, service_id: int) -> Optional[Service]:
    stmt = select(Service).where(Service.id == service_id)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

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

async def get_question(session: AsyncSession, q_id: int) -> Optional[Question]:
    stmt = select(Question).where(Question.id == q_id)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

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

    # 1. SQD Dimension Breakdown
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
    stats["sqd_breakdown"] = sqd_breakdown

    # 2. Client Type Distribution
    ct_counts = {}
    for s in surveys:
        ct = s.client_type or "Unknown"
        ct_counts[ct] = ct_counts.get(ct, 0) + 1
    stats["client_type_dist"] = ct_counts

    # 3. Region Distribution
    reg_counts = {}
    for s in surveys:
        r = s.region or "Unknown"
        reg_counts[r] = reg_counts.get(r, 0) + 1
    stats["region_dist"] = reg_counts

    # 4. Monthly Feedback Trend
    trend_counts = {}
    for s in surveys:
        if s.created_on:
            m_name = s.created_on.strftime("%b")
            trend_counts[m_name] = trend_counts.get(m_name, 0) + 1
    stats["monthly_trend"] = trend_counts

    # 5. Top Evaluated Services
    service_counts = {}
    for s in surveys:
        txs = s.transaction_types or {}
        if isinstance(txs, dict):
            for svc_name in txs.values():
                service_counts[svc_name] = service_counts.get(svc_name, 0) + 1
    sorted_svcs = sorted(service_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    stats["top_services"] = {k: v for k, v in sorted_svcs}

    # 6. Top Scored Officers / Personnel
    officer_ratings = {}
    officer_counts = {}
    for s in surveys:
        if s.evaluator_user_id:
            valid_ratings = [getattr(s, f'sqd{i}') for i in range(9) if getattr(s, f'sqd{i}') and getattr(s, f'sqd{i}') > 0]
            if valid_ratings:
                avg_s = sum(valid_ratings) / len(valid_ratings)
                officer_ratings[s.evaluator_user_id] = officer_ratings.get(s.evaluator_user_id, 0.0) + avg_s
                officer_counts[s.evaluator_user_id] = officer_counts.get(s.evaluator_user_id, 0) + 1

    top_officers_list = []
    for user_id, total_rating in officer_ratings.items():
        u_res = await session.execute(select(User).where(User.id == user_id))
        db_u = u_res.scalar_one_or_none()
        if db_u:
            avg_score = round(total_rating / officer_counts[user_id], 2)
            top_officers_list.append({
                "name": f"{db_u.first_name} {db_u.last_name}",
                "username": db_u.username,
                "avg_rating": avg_score,
                "surveys_count": officer_counts[user_id]
            })
    top_officers_list = sorted(top_officers_list, key=lambda x: (x["avg_rating"], x["surveys_count"]), reverse=True)[:5]
    stats["top_officers"] = top_officers_list

    if user.user_level in [UserLevel.SUPER, UserLevel.ADMIN]:
        unit_count_stmt = select(func.count(OrganizationNode.id)).where(OrganizationNode.node_type == NodeType.UNIT)
        stats["units"] = (await session.execute(unit_count_stmt)).scalar() or 0
        
        dept_count_stmt = select(func.count(OrganizationNode.id)).where(OrganizationNode.node_type == NodeType.DEPARTMENT)
        stats["departments"] = (await session.execute(dept_count_stmt)).scalar() or 0
        
    return stats

# ClientType CRUD
async def get_client_types(session: AsyncSession) -> List[ClientType]:
    stmt = select(ClientType).order_by(ClientType.name)
    res = await session.execute(stmt)
    return res.scalars().all()

async def get_client_type(session: AsyncSession, ct_id: int) -> Optional[ClientType]:
    stmt = select(ClientType).where(ClientType.id == ct_id)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def create_client_type(session: AsyncSession, ct_in: ClientTypeCreate) -> ClientType:
    db_ct = ClientType.model_validate(ct_in)
    session.add(db_ct)
    await session.commit()
    await session.refresh(db_ct)
    return db_ct

# Region CRUD
async def get_regions(session: AsyncSession) -> List[Region]:
    stmt = select(Region).order_by(Region.name)
    res = await session.execute(stmt)
    return res.scalars().all()

async def get_region(session: AsyncSession, r_id: int) -> Optional[Region]:
    stmt = select(Region).where(Region.id == r_id)
    res = await session.execute(stmt)
    return res.scalar_one_or_none()

async def create_region(session: AsyncSession, r_in: RegionCreate) -> Region:
    db_r = Region.model_validate(r_in)
    session.add(db_r)
    await session.commit()
    await session.refresh(db_r)
    return db_r

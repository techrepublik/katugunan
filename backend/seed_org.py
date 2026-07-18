import asyncio
from sqlmodel import select, text
from sqlmodel.ext.asyncio.session import AsyncSession
from app.core.db import engine
from app.models.models import OrganizationNode, Service, NodeType, User

async def seed():
    print("=== STARTING ORGANIZATIONAL HIERARCHY SEEDING ===")
    
    async with AsyncSession(engine) as session:
        # 1. Clean up references and wipe tables
        print("Cleaning up old database records...")
        await session.execute(text("UPDATE users SET org_node_id = NULL;"))
        await session.execute(text("DELETE FROM survey_services_link;"))
        await session.execute(text("DELETE FROM client_surveys;"))
        await session.execute(text("DELETE FROM services;"))
        await session.execute(text("DELETE FROM organization_nodes;"))
        await session.commit()
        
        # Reset primary key sequences for tables
        print("Resetting sequences...")
        await session.execute(text("SELECT setval('organization_nodes_id_seq', 1, false);"))
        await session.execute(text("SELECT setval('services_id_seq', 1, false);"))
        await session.commit()

        # 2. Seed Campuses (BRANCH)
        print("Seeding branches/campuses...")
        main_campus = OrganizationNode(
            name="University of Southern Mindanao - Main Campus",
            short_name="USM-Main",
            node_type=NodeType.BRANCH,
            metadata_info={"location": "Kabacan, Cotabato"}
        )
        kcc_campus = OrganizationNode(
            name="USM Kidapawan City Campus",
            short_name="USM-KCC",
            node_type=NodeType.BRANCH,
            metadata_info={"location": "Kidapawan City, Cotabato"}
        )
        session.add(main_campus)
        session.add(kcc_campus)
        
        await session.flush()
        main_campus_id = main_campus.id
        kcc_campus_id = kcc_campus.id

        # 3. Seed Colleges (UNIT) under Main Campus
        print("Seeding colleges/units...")
        ccis = OrganizationNode(
            name="College of Computing and Information Sciences",
            short_name="CCIS",
            node_type=NodeType.UNIT,
            parent_id=main_campus_id,
            metadata_info={"unit_type": "Academic"}
        )
        ca = OrganizationNode(
            name="College of Agriculture",
            short_name="CA",
            node_type=NodeType.UNIT,
            parent_id=main_campus_id,
            metadata_info={"unit_type": "Academic"}
        )
        ceit = OrganizationNode(
            name="College of Engineering and Information Technology",
            short_name="CEIT",
            node_type=NodeType.UNIT,
            parent_id=main_campus_id,
            metadata_info={"unit_type": "Academic"}
        )
        cbdem = OrganizationNode(
            name="College of Business, Development Economics and Management",
            short_name="CBDEM",
            node_type=NodeType.UNIT,
            parent_id=main_campus_id,
            metadata_info={"unit_type": "Academic"}
        )
        session.add(ccis)
        session.add(ca)
        session.add(ceit)
        session.add(cbdem)
        
        await session.flush()
        ccis_id = ccis.id
        ca_id = ca.id
        ceit_id = ceit.id
        cbdem_id = cbdem.id

        # 4. Seed Departments (DEPARTMENT) under Colleges
        print("Seeding departments...")
        # Under CCIS
        cs_dept = OrganizationNode(
            name="Department of Computer Science",
            short_name="DCS",
            node_type=NodeType.DEPARTMENT,
            parent_id=ccis_id
        )
        it_dept = OrganizationNode(
            name="Department of Information Technology",
            short_name="DIT",
            node_type=NodeType.DEPARTMENT,
            parent_id=ccis_id
        )
        # Under CA
        agronomy_dept = OrganizationNode(
            name="Department of Agronomy",
            short_name="Agronomy",
            node_type=NodeType.DEPARTMENT,
            parent_id=ca_id
        )
        animal_science_dept = OrganizationNode(
            name="Department of Animal Science",
            short_name="AnimalSci",
            node_type=NodeType.DEPARTMENT,
            parent_id=ca_id
        )
        # Under CEIT
        civil_dept = OrganizationNode(
            name="Department of Civil Engineering",
            short_name="CivilEng",
            node_type=NodeType.DEPARTMENT,
            parent_id=ceit_id
        )
        agri_eng_dept = OrganizationNode(
            name="Department of Agricultural and Biosystems Engineering",
            short_name="AgriEng",
            node_type=NodeType.DEPARTMENT,
            parent_id=ceit_id
        )

        session.add(cs_dept)
        session.add(it_dept)
        session.add(agronomy_dept)
        session.add(animal_science_dept)
        session.add(civil_dept)
        session.add(agri_eng_dept)
        
        await session.flush()
        cs_dept_id = cs_dept.id
        it_dept_id = it_dept.id
        agronomy_dept_id = agronomy_dept.id
        animal_science_dept_id = animal_science_dept.id
        civil_dept_id = civil_dept.id
        agri_eng_dept_id = agri_eng_dept.id

        # 5. Seed Positions (POSITION) under Departments
        print("Seeding positions...")
        # Under DCS
        dcs_head = OrganizationNode(
            name="DCS Department Chairperson",
            short_name="DCS-Head",
            node_type=NodeType.POSITION,
            parent_id=cs_dept_id,
            metadata_info={"position_status": "Active"}
        )
        dcs_instructor = OrganizationNode(
            name="Computer Science Instructor",
            short_name="DCS-Inst",
            node_type=NodeType.POSITION,
            parent_id=cs_dept_id,
            metadata_info={"position_status": "Active"}
        )
        # Under DIT
        dit_head = OrganizationNode(
            name="DIT Department Chairperson",
            short_name="DIT-Head",
            node_type=NodeType.POSITION,
            parent_id=it_dept_id,
            metadata_info={"position_status": "Active"}
        )
        dit_instructor = OrganizationNode(
            name="Information Technology Instructor",
            short_name="DIT-Inst",
            node_type=NodeType.POSITION,
            parent_id=it_dept_id,
            metadata_info={"position_status": "Active"}
        )

        session.add(dcs_head)
        session.add(dcs_instructor)
        session.add(dit_head)
        session.add(dit_instructor)
        
        await session.flush()
        dcs_head_id = dcs_head.id
        dcs_instructor_id = dcs_instructor.id
        dit_head_id = dit_head.id
        dit_instructor_id = dit_instructor.id

        # 6. Seed Service Catalog under Positions
        print("Seeding services...")
        # DCS Head Services
        session.add(Service(
            org_node_id=dcs_head_id,
            service_name="Evaluation and Credit Mapping of Transfer Credentials",
            service_no=101,
            service_type="External",
            service_time="15 minutes",
            service_is_payment=False
        ))
        session.add(Service(
            org_node_id=dcs_head_id,
            service_name="CS Thesis Topic Presentation & Committee Assignment",
            service_no=102,
            service_type="Internal",
            service_time="20 minutes",
            service_is_payment=False
        ))
        # DIT Head Services
        session.add(Service(
            org_node_id=dit_head_id,
            service_name="IT Laboratory Reservation & Facilities Request",
            service_no=201,
            service_type="Internal",
            service_time="5 minutes",
            service_is_payment=False
        ))
        session.add(Service(
            org_node_id=dit_head_id,
            service_name="IT Capstone Project Proposal Review",
            service_no=202,
            service_type="External",
            service_time="25 minutes",
            service_is_payment=False
        ))
        # Instructor Services
        session.add(Service(
            org_node_id=dcs_instructor_id,
            service_name="Student Academic Advising & Consultation",
            service_no=301,
            service_type="Internal",
            service_time="15 minutes",
            service_is_payment=False
        ))
        session.add(Service(
            org_node_id=dit_instructor_id,
            service_name="Student Technical Consultation & Project Mentoring",
            service_no=302,
            service_type="Internal",
            service_time="15 minutes",
            service_is_payment=False
        ))

        # 7. Update existing test users to associate them with the new seeded nodes
        print("Re-linking test users to seeded organization hierarchy...")
        # Get users
        res = await session.execute(select(User))
        users = res.scalars().all()
        for u in users:
            if u.user_level == "Super" or u.user_level == "Admin":
                u.org_node_id = main_campus_id
            elif u.user_level == "Unit":
                # Give Unit users CCIS or DCS-Head position
                if u.username == "josh04" or u.username == "testoperator":
                    u.org_node_id = dcs_head_id
                else:
                    u.org_node_id = ccis_id
            session.add(u)
            
        await session.commit()
        print("=== ORGANIZATIONAL HIERARCHY SEEDED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(seed())

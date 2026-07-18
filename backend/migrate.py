import psycopg2
from psycopg2.extras import RealDictCursor
import json

# Connection parameters
SOURCE_DB = {
    "dbname": "katugunan01",
    "user": "postgres",
    "password": "P@ssw0rd",
    "host": "localhost",
    "port": 5432
}

TARGET_DB = {
    "dbname": "freshdb",
    "user": "postgres",
    "password": "P@ssw0rd",
    "host": "localhost", # or 'db' inside docker
    "port": 5433
}

def migrate():
    print("Connecting to source database...")
    src_conn = psycopg2.connect(**SOURCE_DB)
    src_cur = src_conn.cursor(cursor_factory=RealDictCursor)

    print("Connecting to target database...")
    tgt_conn = psycopg2.connect(**TARGET_DB)
    tgt_cur = tgt_conn.cursor()

    # Clear target database to avoid duplicate key errors
    print("Clearing target tables...")
    tgt_cur.execute("TRUNCATE TABLE survey_services_link, client_surveys, questions, services, users, organization_nodes RESTART IDENTITY CASCADE;")
    tgt_conn.commit()

    # Mappings from source PK -> target PK
    branch_map = {}      # source_branch_id -> target_node_id
    unit_map = {}        # source_unit_id -> target_node_id
    dept_map = {}        # source_dept_id -> target_node_id
    position_map = {}    # source_position_id -> target_node_id
    service_map = {}     # source_service_id -> target_service_id
    user_map = {}        # source_user_id -> target_user_id
    survey_map = {}      # source_survey_id -> target_survey_id

    # 1. Migrate Branches
    print("Migrating branches...")
    src_cur.execute("SELECT * FROM home_branch;")
    branches = src_cur.fetchall()
    for b in branches:
        tgt_cur.execute(
            "INSERT INTO organization_nodes (name, short_name, address, node_type, parent_id, metadata_info) VALUES (%s, %s, %s, 'BRANCH', NULL, '{}'::jsonb) RETURNING id;",
            (b["branch_name"], b["branch_short_name"], b["branch_address"])
        )
        new_id = tgt_cur.fetchone()[0]
        branch_map[b["id"]] = new_id

    # 2. Migrate Units
    print("Migrating units...")
    src_cur.execute("SELECT * FROM home_unit;")
    units = src_cur.fetchall()
    for u in units:
        parent_id = branch_map.get(u["branch_id"])
        metadata = json.dumps({"unit_type": u["unit_type"]})
        tgt_cur.execute(
            "INSERT INTO organization_nodes (name, short_name, node_type, parent_id, metadata_info) VALUES (%s, %s, 'UNIT', %s, %s::jsonb) RETURNING id;",
            (u["unit_name"], u["unit_short_name"], parent_id, metadata)
        )
        new_id = tgt_cur.fetchone()[0]
        unit_map[u["id"]] = new_id

    # 3. Migrate Departments
    print("Migrating departments...")
    src_cur.execute("SELECT * FROM home_department;")
    depts = src_cur.fetchall()
    for d in depts:
        parent_id = unit_map.get(d["unit_id_id"])
        tgt_cur.execute(
            "INSERT INTO organization_nodes (name, short_name, node_type, parent_id, metadata_info) VALUES (%s, %s, 'DEPARTMENT', %s, '{}'::jsonb) RETURNING id;",
            (d["department_name"], d["department_short_name"], parent_id)
        )
        new_id = tgt_cur.fetchone()[0]
        dept_map[d["id"]] = new_id

    # 4. Migrate Positions
    print("Migrating positions...")
    src_cur.execute("SELECT * FROM home_position;")
    positions = src_cur.fetchall()
    for p in positions:
        parent_id = dept_map.get(p["department_id"])
        metadata = json.dumps({"position_status": p["position_status"]})
        tgt_cur.execute(
            "INSERT INTO organization_nodes (name, short_name, node_type, parent_id, metadata_info) VALUES (%s, %s, 'POSITION', %s, %s::jsonb) RETURNING id;",
            (p["position_name"], p["position_short"], parent_id, metadata)
        )
        new_id = tgt_cur.fetchone()[0]
        position_map[p["id"]] = new_id

    # 5. Migrate Services
    print("Migrating services...")
    src_cur.execute("SELECT * FROM home_service;")
    services = src_cur.fetchall()
    for s in services:
        parent_id = position_map.get(s["position_id_id"])
        tgt_cur.execute(
            "INSERT INTO services (org_node_id, service_name, service_no, service_type, service_time, service_is_payment) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;",
            (parent_id, s["service_name"], s["service_no"], s["service_type"], s["service_time"], s["service_is_payment"])
        )
        new_id = tgt_cur.fetchone()[0]
        service_map[s["id"]] = new_id

    # 6. Migrate Questions
    print("Migrating questions...")
    src_cur.execute("SELECT * FROM home_question;")
    questions = src_cur.fetchall()
    for q in questions:
        tgt_cur.execute(
            "INSERT INTO questions (question_id, question_question, question_type) VALUES (%s, %s, %s);",
            (q["question_id"], q["question_question"], q["question_type"])
        )

    # 7. Migrate Users
    print("Migrating users...")
    src_cur.execute("SELECT * FROM home_customuser;")
    users = src_cur.fetchall()
    for u in users:
        # User maps to position org node
        org_node_id = position_map.get(u["position_id"]) or dept_map.get(u["department_id"])
        
        tgt_cur.execute(
            """INSERT INTO users (
                id, username, email, hashed_password, first_name, middle_name, last_name, 
                id_number, sex, birth_date, contact_no, user_level, org_node_id, 
                picture_url, qrcode_image_url, qrcode_payload, is_active, registered_on
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
            (
                u["id"], u["username"], u["email"], u["password"], u["first_name"], u["middle_name"], u["last_name"],
                u["id_number"], u["sex"], u["birth_date"], u["contact_no"], u["user_level"].title() if u["user_level"] else None, org_node_id,
                u["picture"], u["qrcode_image"], u["qrcode_url"], u["is_active"], u["registered_on"]
            )
        )
        new_id = tgt_cur.fetchone()[0]
        user_map[u["id"]] = new_id

    # 8. Migrate Surveys
    print("Migrating client surveys...")
    src_cur.execute("SELECT * FROM home_clientsurvey;")
    surveys = src_cur.fetchall()
    for sv in surveys:
        evaluator_id = user_map.get(sv["evaluator"]) # evaluator stores User ID in source
        
        tgt_cur.execute(
            """INSERT INTO client_surveys (
                id, transaction_id, evaluator_user_id, client_type, region, sex, age,
                cc1, cc2, cc3, transaction_types, suggestions, email, others,
                latitude, longitude, sqd0, sqd1, sqd2, sqd3, sqd4, sqd5, sqd6, sqd7, sqd8, created_on
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
            (
                sv["id"], sv["transaction_id"], evaluator_id, sv["client_type"], sv["region"], sv["sex"], sv["age"],
                sv["cc1"], sv["cc2"], sv["cc3"], json.dumps(sv["transaction_types"]), sv["suggestions"], sv["email"], sv["others"],
                sv["latitude"], sv["longitude"], sv["sqd0"], sv["sqd1"], sv["sqd2"], sv["sqd3"], sv["sqd4"], sv["sqd5"],
                sv["sqd6"], sv["sqd7"], sv["sqd8"], sv["created_on"]
            )
        )
        new_id = tgt_cur.fetchone()[0]
        survey_map[sv["id"]] = new_id

    # 9. Migrate Survey Services Links
    print("Migrating survey service links...")
    src_cur.execute("SELECT * FROM home_clientsurvey_services;")
    links = src_cur.fetchall()
    for link in links:
        survey_id = survey_map.get(link["clientsurvey_id"])
        service_id = service_map.get(link["service_id"])
        if survey_id and service_id:
            tgt_cur.execute(
                "INSERT INTO survey_services_link (survey_id, service_id) VALUES (%s, %s) ON CONFLICT DO NOTHING;",
                (survey_id, service_id)
            )

    tgt_conn.commit()
    print("Migration finished successfully!")

    src_cur.close()
    src_conn.close()
    tgt_cur.close()
    tgt_conn.close()

if __name__ == "__main__":
    migrate()

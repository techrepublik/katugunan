import asyncio
import random
from datetime import datetime, timedelta
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import engine
from app.models.models import ClientSurvey, User, Service, SurveyServiceLink

async def seed_surveys():
    print("Seeding dummy surveys for analytics...")
    
    async with AsyncSession(engine) as session:
        # Get users and services
        users = (await session.execute(select(User))).scalars().all()
        services = (await session.execute(select(Service))).scalars().all()
        
        if not users:
            print("No users found to link surveys to. Please seed users first.")
            return
            
        if not services:
            print("No services found to link surveys to. Please seed services first.")
            return

        evaluator_ids = [u.id for u in users if u.user_level in ["Super", "Admin", "Unit"]]
        if not evaluator_ids:
            evaluator_ids = [users[0].id]
            
        # Store services as plain dict list to prevent lazy-loading issues
        service_items = [{"id": s.id, "name": s.service_name} for s in services]
            
        client_types = ["Student", "Faculty", "Staff", "Alumni", "Visitor"]
        regions = ["Region XII", "NCR", "BARMM"]
        sexes = ["Male", "Female"]
        
        feedbacks = [
            "Very fast service, keep it up!",
            "Friendly staff and comfortable waiting area.",
            "Long queues at the payment counter. Needs improvement.",
            "Process was unclear at first, but officer guided me well.",
            "Outstanding service from the registrar team.",
            "Satisfactory experience.",
            "Air conditioning was not working, very warm.",
            "Simple, straightforward transactions.",
            "Staff was very accommodating and polite.",
            "Took too long to verify documents.",
            "Highly recommended services!"
        ]
        
        now = datetime.utcnow()
        
        # Create 200 dummy surveys over the last 12 days
        for i in range(200):
            days_ago = random.randint(0, 12)
            created_on = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            ct = random.choice(client_types)
            reg = random.choice(regions)
            sex = random.choice(sexes)
            age = random.randint(18, 55)
            
            bias = random.random()
            if bias > 0.85:
                ratings = [random.randint(1, 2) for _ in range(9)]
            elif bias > 0.65:
                ratings = [random.randint(3, 4) for _ in range(9)]
            else:
                ratings = [random.randint(4, 5) for _ in range(9)]
                
            cc1 = random.choice(["1", "2", "3", "4"])
            cc2 = random.choice(["1", "2", "3"]) if cc1 != "4" else "4"
            cc3 = random.choice(["1", "2", "3"]) if cc1 != "4" else "4"
            
            chosen_evaluator = random.choice(evaluator_ids)
            suggestions = random.choice(feedbacks) if random.random() > 0.3 else None
            email = f"client{i}@gmail.com" if random.random() > 0.2 else None
            
            # Assign coordinates inside USM Kabacan campus bounds
            lat = round(random.uniform(7.122, 7.128), 6)
            lng = round(random.uniform(124.838, 124.846), 6)

            survey = ClientSurvey(
                client_type=ct,
                region=reg,
                sex=sex,
                age=age,
                cc1=cc1,
                cc2=cc2,
                cc3=cc3,
                evaluator_user_id=chosen_evaluator,
                suggestions=suggestions,
                email=email,
                created_on=created_on,
                latitude=lat,
                longitude=lng,
                sqd0=ratings[0],
                sqd1=ratings[1],
                sqd2=ratings[2],
                sqd3=ratings[3],
                sqd4=ratings[4],
                sqd5=ratings[5],
                sqd6=ratings[6],
                sqd7=ratings[7],
                sqd8=ratings[8],
                transaction_types={}
            )
            
            session.add(survey)
            await session.flush() # Flush to populate survey.id
            
            num_services = random.randint(1, 2)
            linked_svcs = random.sample(service_items, num_services)
            
            txs = {}
            for idx, svc in enumerate(linked_svcs):
                link = SurveyServiceLink(survey_id=survey.id, service_id=svc["id"])
                session.add(link)
                txs[str(idx)] = svc["name"]
                
            survey.transaction_types = txs
            session.add(survey)
            
        await session.commit()
        print("=== 200 DUMMY SURVEYS SEEDED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(seed_surveys())

import uuid
from django.test import TestCase, Client
from django.urls import reverse
from django.conf import settings
from .models import Branch, Unit, Department, Position, Service, Question, CustomUser, ClientSurvey
import json

class KatugunanModelsTest(TestCase):
    def setUp(self):
        # Create models
        self.branch = Branch.objects.create(
            branch_name="Main Campus",
            branch_short_name="MC",
            branch_address="Kabacan, Cotabato"
        )
        self.unit = Unit.objects.create(
            unit_name="College of Computing",
            unit_short_name="CC",
            unit_type=Unit.ACADEMIC,
            branch=self.branch
        )
        self.department = Department.objects.create(
            department_name="Information Technology",
            department_short_name="IT",
            unit_id=self.unit
        )
        self.position = Position.objects.create(
            department=self.department,
            position_name="Instructor",
            position_short="Inst",
            position_status="Permanent"
        )
        self.service = Service.objects.create(
            position_id=self.position,
            service_name="Provide Academic Advising",
            service_no=1,
            service_type="Internal",
            service_time="10-min",
            service_is_payment=False
        )
        self.question = Question.objects.create(
            question_id="Q1",
            question_question="Is the staff helpful?",
            question_type=Question.GENERAL
        )

    def test_model_str_representations(self):
        # Test __str__ methods of models
        self.assertEqual(str(self.branch), "MC")
        self.assertEqual(str(self.unit), "CC")
        self.assertEqual(str(self.department), "Information Technology")
        self.assertEqual(str(self.position), "Instructor")
        self.assertEqual(str(self.service), "Provide Academic Advising")
        # Verify Question __str__ works correctly without AttributeError
        self.assertEqual(str(self.question), "Q1- Is the staff helpful?")

    def test_question_choices(self):
        # Verify that SUPPORT choice constant redefinition bug is fixed
        self.assertEqual(Question.SUPPORT, 'Support')
        self.assertEqual(Question.PRODUCTION, 'Production')
        types_dict = dict(Question.types)
        self.assertEqual(types_dict['Support'], 'Support')
        self.assertEqual(types_dict['Production'], 'Production')


class CustomUserTest(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(branch_name="MC", branch_short_name="MC")
        self.unit = Unit.objects.create(unit_name="CC", unit_short_name="CC", branch=self.branch)
        self.department = Department.objects.create(department_name="IT", department_short_name="IT", unit_id=self.unit)
        self.position = Position.objects.create(department=self.department, position_name="Inst")

    def test_user_creation_generates_uuid_and_qrcode(self):
        user = CustomUser.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpassword",
            first_name="Test",
            last_name="User",
            department=self.department,
            position=self.position
        )
        # Check automatic UUID generation
        self.assertTrue(user.user_id)
        # Verify UUID format
        try:
            uuid.UUID(user.user_id)
        except ValueError:
            self.fail("user_id is not a valid UUID")

        # Verify QR Code image is generated
        self.assertTrue(user.qrcode_image)
        self.assertTrue(user.qrcode_url)
        self.assertIn(user.user_id, user.qrcode_url)


class ClientSurveyViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.branch = Branch.objects.create(branch_name="MC", branch_short_name="MC")
        self.unit = Unit.objects.create(unit_name="CC", unit_short_name="CC", branch=self.branch)
        self.department = Department.objects.create(department_name="IT", department_short_name="IT", unit_id=self.unit)
        self.position = Position.objects.create(department=self.department, position_name="Inst")
        self.user = CustomUser.objects.create_user(
            username="officer",
            email="officer@example.com",
            password="password",
            department=self.department,
            position=self.position
        )
        self.service = Service.objects.create(
            position_id=self.position,
            service_name="Academic Advising"
        )
        # Create some dummy surveys for testing views
        self.survey1 = ClientSurvey.objects.create(
            user_id=self.user.user_id,
            client_type="Student",
            region="Region XII",
            sex="Male",
            age=20,
            transaction_types=["Inquiry on Services"],
            cc1="1",
            cc2="1",
            cc3="1",
            sqd0=5, sqd1=5, sqd2=4, sqd3=5, sqd4=4, sqd5=5, sqd6=4, sqd7=5, sqd8=5
        )
        self.survey2 = ClientSurvey.objects.create(
            user_id=self.user.user_id,
            client_type="Faculty",
            region="Region XII",
            sex="Female",
            age=35,
            transaction_types=["Bills/Fees Payment"],
            cc1="2",
            cc2="2",
            cc3="2",
            sqd0=4, sqd1=4, sqd2=4, sqd3=4, sqd4=4, sqd5=4, sqd6=4, sqd7=4, sqd8=4
        )

    def test_merged_get_sqd_data_view(self):
        # Query with year_sqd
        current_year = self.survey1.created_on.year
        url = reverse('home:populate_sgd')
        
        # Test with year_sqd parameter
        response = self.client.get(url, {'year_sqd': current_year})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content.decode('utf-8'))
        self.assertIn('labels', data)
        self.assertIn('data', data)

        # Test with year_sgd parameter
        response = self.client.get(url, {'year_sgd': current_year})
        self.assertEqual(response.status_code, 200)
        data_sgd = json.loads(response.content.decode('utf-8'))
        self.assertEqual(data, data_sgd)

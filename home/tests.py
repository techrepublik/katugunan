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
            position=self.position,
            user_level="Admin"
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
        # Log in the user with authorized role
        self.client.login(username="officer", password="password")
        
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


class RBACPermissionsTest(TestCase):
    def setUp(self):
        self.client = Client()
        
        # Setup units, departments, positions
        self.branch = Branch.objects.create(branch_name="Branch MC", branch_short_name="BMC")
        self.unit1 = Unit.objects.create(unit_name="Unit Computing", unit_short_name="UC", branch=self.branch)
        self.unit2 = Unit.objects.create(unit_name="Unit Nursing", unit_short_name="UN", branch=self.branch)
        
        self.dept1 = Department.objects.create(department_name="IT Dept", department_short_name="ITD", unit_id=self.unit1)
        self.dept2 = Department.objects.create(department_name="Nursing Dept", department_short_name="ND", unit_id=self.unit2)
        
        self.pos1 = Position.objects.create(department=self.dept1, position_name="IT Instructor")
        self.pos2 = Position.objects.create(department=self.dept2, position_name="Nursing Instructor")
        
        # Super user
        self.super_user = CustomUser.objects.create_user(
            username="superuser", email="super@example.com", password="password",
            user_level="Super", is_superuser=True
        )
        # Admin user
        self.admin_user = CustomUser.objects.create_user(
            username="adminuser", email="admin@example.com", password="password",
            user_level="Admin", department=self.dept1, position=self.pos1
        )
        # Unit user (UC Unit)
        self.unit_user = CustomUser.objects.create_user(
            username="unituser", email="unit@example.com", password="password",
            user_level="Unit", department=self.dept1, position=self.pos1
        )
        # Client user
        self.client_user = CustomUser.objects.create_user(
            username="clientuser", email="client@example.com", password="password",
            user_level="Client", department=self.dept2, position=self.pos2
        )
        
        # Surveys for Unit 1 officer (admin_user)
        self.survey_u1 = ClientSurvey.objects.create(
            user_id=self.admin_user.user_id,
            client_type="Student", region="Region XII", sex="Male", age=22,
            transaction_types=["Inquiry on Services"], cc1="1", cc2="1", cc3="1",
            sqd0=5, sqd1=5, sqd2=5, sqd3=5, sqd4=5, sqd5=5, sqd6=5, sqd7=5, sqd8=5
        )
        # Surveys for Unit 2 officer (client_user - who is treated as evaluated staff)
        self.survey_u2 = ClientSurvey.objects.create(
            user_id=self.client_user.user_id,
            client_type="Student", region="Region XII", sex="Female", age=21,
            transaction_types=["Inquiry on Services"], cc1="1", cc2="1", cc3="1",
            sqd0=1, sqd1=1, sqd2=1, sqd3=1, sqd4=1, sqd5=1, sqd6=1, sqd7=1, sqd8=1
        )

    def test_anonymous_redirect(self):
        url = reverse('home:dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_client_access_denied(self):
        self.client.login(username="clientuser", password="password")
        url = reverse('home:dashboard')
        response = self.client.get(url)
        # client level should raise PermissionDenied (HTTP 403)
        self.assertEqual(response.status_code, 403)

    def test_unit_user_restricted_endpoints(self):
        self.client.login(username="unituser", password="password")
        # Unit user should be allowed to view dashboard
        url = reverse('home:dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Unit user should be denied access to management/config views, e.g. branch list
        url_branch = reverse('home:branch_list')
        response = self.client.get(url_branch)
        self.assertEqual(response.status_code, 403)

    def test_unit_user_data_isolation(self):
        # Logged in as Unit User of Unit 1
        self.client.login(username="unituser", password="password")
        
        # Test sqd counts endpoint
        url = reverse('home:populate_sgd')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content.decode('utf-8'))
        
        # Only surveys matching Unit 1 should be aggregated.
        # self.survey_u1 has 9 fields of score 5. Total counts of score 5 label should be 9.
        # self.survey_u2 has score 1, which belongs to Unit 2 (Nursing), and should be excluded.
        labels = data['labels']
        values = data['data']
        res_dict = dict(zip(labels, values))
        
        self.assertEqual(res_dict.get('Strongly Agree', 0), 9)
        self.assertEqual(res_dict.get('Strongly Disagree', 0), 0)

    def test_admin_cannot_modify_super(self):
        self.client.login(username="adminuser", password="password")
        # Attempt to edit super_user password
        url = reverse('home:change_user_password', kwargs={'pk': self.super_user.pk})
        response = self.client.post(url, {'new_password': 'newpassword123', 'confirm_password': 'newpassword123'})
        self.assertEqual(response.status_code, 403)

        # Attempt to delete super_user
        url_del = reverse('home:user_delete', kwargs={'pk': self.super_user.pk})
        response = self.client.delete(url_del)
        self.assertEqual(response.status_code, 403)

import os
from PIL import Image
from typing import Tuple
import uuid

from django.db.models.fields import BigAutoField
import qrcode
from io import BytesIO
from django.core.files import File
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.conf import settings


class Branch(models.Model):
    branch_name = models.CharField(max_length=250)
    branch_short_name = models.CharField(max_length=100)
    branch_address = models.CharField(max_length=250, blank=True, null=True)

    def __str__(self) -> str:
        return self.branch_short_name

    class Meta:
        ordering = ['branch_short_name',]


class Unit(models.Model):
    ACADEMIC = 'Academic'
    SUPPORT = 'Support'
    ADMINISTRATION = 'Administration'
    RESEARCH = 'Research'
    PRODUCTION = 'Production'
    OTHERS = 'Others'
    types = (
        (ACADEMIC, 'Academic'),
        (SUPPORT, 'Support'),
        (ADMINISTRATION, 'Administration'),
        (RESEARCH, 'Research'),
        (PRODUCTION, 'Production'),
        (OTHERS, 'Others')
    )
    unit_name = models.CharField(max_length=100)
    unit_short_name = models.CharField(max_length=50)
    unit_type = models.CharField(
        max_length=50, choices=types, default=ACADEMIC)
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, blank=True, null=True)

    def __str__(self) -> str:
        return self.unit_short_name

    class Meta:
        ordering = ['unit_short_name']


class Department(models.Model):
    department_name = models.CharField(max_length=100)
    department_short_name = models.CharField(
        max_length=50, blank=True, null=True)
    unit_id = models.ForeignKey(
        Unit, related_name='units', on_delete=models.SET_NULL, blank=True, null=True)

    def __str__(self) -> str:
        return self.department_name

    class Meta:
        ordering = ['department_short_name']


class Position(models.Model):
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, blank=True, null=True)
    position_name = models.CharField(max_length=150)
    position_short = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self) -> str:
        return self.position_name

    class Meta:
        ordering = ['position_name',]


class Service(models.Model):
    position_id = models.ForeignKey(
        Position, on_delete=models.SET_NULL, blank=True, null=True)
    service_name = models.CharField(max_length=150)
    service_no = models.IntegerField(default=0)
    service_type = models.CharField(max_length=50, choices=[(
        'Internal', 'Internal'), ('External', 'External'), ('All', 'All')], default='Internal')
    service_time = models.CharField(max_length=150, blank=True, null=True)
    service_is_payment = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.service_name

    class Meta:
        ordering = ['service_name',]


class Question(models.Model):
    GENERAL = 'General'
    ADMIN = 'Admin'
    TEACHING = 'Teaching'
    RESEARCH = 'Research'
    SUPPORT = 'Support'
    SUPPORT = 'Production'
    types = (
        (GENERAL, 'General'),
        (ADMIN, 'Admin'),
        (TEACHING, 'Teaching'),
        (RESEARCH, 'Research'),
        (SUPPORT, 'Support'),
        (SUPPORT, 'Production')
    )

    question_id = models.CharField(
        max_length=10, unique=True)
    question_question = models.CharField(max_length=254)
    question_type = models.CharField(
        max_length=20, choices=types, default=GENERAL)

    def __str__(self) -> str:
        return f'{self.question_id}- {self.question}'

    class Meta:
        ordering = ['question_id']


def user_directory_path(instance, filename):
    # Extract the file extension

    extension = os.path.splitext(filename)[1]
    # Create the new file name in the format "user_id-username.extension"
    new_filename = f"{instance.user_id}_{instance.username}{extension}"
    # Return the path where the file will be saved
    return f"profile_pictures/{new_filename}"


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True, blank=False)
    id_number = models.CharField(max_length=20, blank=True, null=True)
    middle_name = models.CharField(max_length=50, blank=True, null=True)
    user_id = models.CharField(max_length=36, unique=True, editable=True)
    sex = models.CharField(max_length=10, choices=[
                           ('M', 'Male'), ('F', 'Female')], blank=True)
    birth_date = models.DateField(null=True, blank=True)
    contact_no = models.CharField(max_length=50, blank=True, null=True)
    registered_on = models.DateTimeField(default=timezone.now)
    user_level = models.CharField(max_length=20, choices=[('Admin', 'Admin'), (
        'Super', 'Super'), ('Unit', 'Unit'), ('Client', 'Client')], default='Client')
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True)
    position = models.ForeignKey(
        Position, on_delete=models.SET_NULL, blank=True, null=True)
    picture = models.ImageField(
        upload_to=user_directory_path, null=True, blank=True)
    qrcode = models.ImageField(
        upload_to='qrcodes/', blank=True, null=True)  # QR code field

    def save(self, *args, **kwargs):
        # Generate user_id if it doesn't already exist
        if not self.user_id:
            self.user_id = str(uuid.uuid4())

            # Generate QR code based on user_id
            qr = qrcode.make(self.user_id)
            qr_io = BytesIO()
            qr.save(qr_io, 'PNG')
            qr_file = File(qr_io, name=f"{self.user_id}.png")

            # Save the QR code to the qrcode field
            self.qrcode.save(qr_file.name, qr_file, save=False)

        # Call the super save method
        super().save(*args, **kwargs)

        # Check if there is a picture and resize it
        if self.picture:
            picture_path = self.picture.path
            img = Image.open(picture_path)

            # Resize image to 200x200
            # Convert to RGB to ensure JPEG compatibility
            img = img.convert("RGB")
            img = img.resize((200, 200), Image.LANCZOS)

            # Save it back to the same path with optimized settings
            img.save(picture_path, format='JPEG', quality=90)

    def __str__(self):
        return f'{self.last_name}, {self.first_name}'


class ClientSurvey(models.Model):
    # Define choices for each CC question
    CC1_CHOICES = [
        ('1', "I know what a CC is and I saw this office’s CC."),
        ('2', "I know what a CC is but I did NOT see this office’s CC."),
        ('3', "I know what a CC is but I did NOT see this office’s CC."),
        ('4', "I do not know what a CC is and I did NOT see one in this office."),
    ]

    CC2_CHOICES = [
        ('1', "Easy to see"),
        ('2', "Somewhat easy to see"),
        ('3', "Difficult to see"),
        ('4', "Not visible at all"),
        ('5', "N/A"),
    ]

    CC3_CHOICES = [
        ('1', "Helped very much"),
        ('2', "Somewhat helped"),
        ('3', "Did not help"),
        ('4', "N/A"),
    ]

    CLIENT_TYPES = [
        ('Student', 'Student'),
        ('Faculty', 'Faculty'),
        ('Staff', 'Staff'),
        ('Alumni', 'Alumni'),
        ('Parent/Guardian', 'Parent/Guardian'),
        ('Supplier/Provider', 'Supplier/Provider'),
        ('Visitor', 'Visitor'),
    ]

    REGIONS = [
        ('NCR', 'NCR (National Capital Region)'),
        ('CAR', 'CAR (Cordillera Administrative Region)'),
        ('Region I', 'Region I (Ilocos Region)'),
        ('Region II', 'Region II (Cagayan Valley)'),
        ('Region III', 'Region III (Central Luzon)'),
        ('Region IV-A', 'Region IV-A (CALABARZON)'),
        ('Region IV-B', 'Region IV-B (MIMAROPA)'),
        ('Region V', 'Region V (Bicol Region)'),
        ('Region VI', 'Region VI (Western Visayas)'),
        ('Region VII', 'Region VII (Central Visayas)'),
        ('Region VIII', 'Region VIII (Eastern Visayas)'),
        ('Region IX', 'Region IX (Zamboanga Peninsula)'),
        ('Region X', 'Region X (Northern Mindanao)'),
        ('Region XI', 'Region XI (Davao Region)'),
        ('Region XII', 'Region XII (SOCCSKSARGEN)'),
        ('Region XIII', 'Region XIII (Caraga)'),
        ('BARMM', 'BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)'),
    ]

    SATISFACTION_CHOICES = [
        (1, 'Strongly Disagree'),
        (2, 'Disagree'),
        (3, 'Neither Agree nor Disagree'),
        (4, 'Agree'),
        (5, 'Strongly Agree'),
        (0, 'Not Applicable'),
    ]

    # Fields for each question, using choices
    cc1 = models.CharField(
        max_length=1,
        choices=CC1_CHOICES,
        verbose_name="Awareness of CC",
        help_text="Which of the following best describes your awareness of CC?"
    )
    cc2 = models.CharField(
        max_length=1,
        choices=CC2_CHOICES,
        verbose_name="Visibility of CC",
        help_text="If aware of CC, would you say that the CC of this office was...?"
    )
    cc3 = models.CharField(
        max_length=1,
        choices=CC3_CHOICES,
        verbose_name="Effectiveness of CC",
        help_text="If aware of CC, how much did the CC help you in your transaction?"
    )

    # Define the many services
    services = models.ManyToManyField(
        Service, blank=True, related_name='users')

    # Define the fields
    transaction_id = models.CharField(
        max_length=100, unique=True, editable=True, default=uuid.uuid4)
    user_id = models.CharField(
        max_length=100, blank=True, null=True)  # CharField for user_id
    client_type = models.CharField(
        max_length=50, choices=CLIENT_TYPES, default='Faculty')
    region = models.CharField(
        max_length=50, choices=REGIONS, default='Region XII')
    sex = models.CharField(max_length=6, choices=[
                           ('Male', 'Male'), ('Female', 'Female')], default='Male')
    age = models.PositiveIntegerField()
    # Use JSONField to store multiple transaction types
    transaction_types = models.JSONField()
    suggestions = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    evaluator = models.CharField(blank=True, null=True)
    others = models.CharField(blank=True, null=True)
    created_on = models.DateTimeField(auto_now_add=True)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True)

    # Service Quality Dimensions fields (SQD0 - SQD8)
    sqd0 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd1 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd2 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd3 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd4 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd5 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd6 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd7 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)
    sqd8 = models.IntegerField(
        choices=SATISFACTION_CHOICES, blank=True, null=True)

    def __str__(self):
        return f"{self.client_type} - {self.region}"


class Rating(models.Model):
    # user = models.ForeignKey(settings.AUTH_USER_MODEL,
    #                          on_delete=models.CASCADE, blank=True, null=True)
    rating = models.PositiveIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)], default=5)
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating} stars"

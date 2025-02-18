# Generated by Django 4.2.16 on 2024-11-05 21:30

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0010_clientsurvey'),
    ]

    operations = [
        migrations.AddField(
            model_name='clientsurvey',
            name='transaction_id',
            field=models.CharField(default=uuid.uuid4, max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='clientsurvey',
            name='client_type',
            field=models.CharField(choices=[('Student', 'Student'), ('Faculty', 'Faculty'), ('Staff', 'Staff'), ('Alumni', 'Alumni'), ('Parent/Guardian', 'Parent/Guardian'), ('Supplier/Provider', 'Supplier/Provider'), ('Visitor', 'Visitor')], max_length=50),
        ),
        migrations.AlterField(
            model_name='clientsurvey',
            name='region',
            field=models.CharField(choices=[('NCR', 'NCR (National Capital Region)'), ('CAR', 'CAR (Cordillera Administrative Region)'), ('Region I', 'Region I (Ilocos Region)'), ('Region II', 'Region II (Cagayan Valley)'), ('Region III', 'Region III (Central Luzon)'), ('Region IV-A', 'Region IV-A (CALABARZON)'), ('Region IV-B', 'Region IV-B (MIMAROPA)'), ('Region V', 'Region V (Bicol Region)'), ('Region VI', 'Region VI (Western Visayas)'), ('Region VII', 'Region VII (Central Visayas)'), ('Region VIII', 'Region VIII (Eastern Visayas)'), ('Region IX', 'Region IX (Zamboanga Peninsula)'), ('Region X', 'Region X (Northern Mindanao)'), ('Region XI', 'Region XI (Davao Region)'), ('Region XII', 'Region XII (SOCCSKSARGEN)'), ('Region XIII', 'Region XIII (Caraga)'), ('BARMM', 'BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)')], default='Region XII', max_length=50),
        ),
        migrations.AlterField(
            model_name='clientsurvey',
            name='sex',
            field=models.CharField(choices=[('Male', 'Male'), ('Female', 'Female')], default='Male', max_length=6),
        ),
        migrations.AlterField(
            model_name='clientsurvey',
            name='user_id',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]

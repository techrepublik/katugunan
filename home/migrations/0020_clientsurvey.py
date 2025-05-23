# Generated by Django 4.2.16 on 2025-02-10 11:45

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0019_delete_clientsurvey'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientSurvey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cc1', models.CharField(choices=[('1', 'I know what a CC is and I saw this office’s CC.'), ('2', 'I know what a CC is but I did NOT see this office’s CC.'), ('3', 'I know what a CC is but I did NOT see this office’s CC.'), ('4', 'I do not know what a CC is and I did NOT see one in this office.')], help_text='Which of the following best describes your awareness of CC?', max_length=1, verbose_name='Awareness of CC')),
                ('cc2', models.CharField(choices=[('1', 'Easy to see'), ('2', 'Somewhat easy to see'), ('3', 'Difficult to see'), ('4', 'Not visible at all'), ('5', 'N/A')], help_text='If aware of CC, would you say that the CC of this office was...?', max_length=1, verbose_name='Visibility of CC')),
                ('cc3', models.CharField(choices=[('1', 'Helped very much'), ('2', 'Somewhat helped'), ('3', 'Did not help'), ('4', 'N/A')], help_text='If aware of CC, how much did the CC help you in your transaction?', max_length=1, verbose_name='Effectiveness of CC')),
                ('transaction_id', models.CharField(default=uuid.uuid4, max_length=100, unique=True)),
                ('user_id', models.CharField(blank=True, max_length=100, null=True)),
                ('client_type', models.CharField(choices=[('Student', 'Student'), ('Faculty', 'Faculty'), ('Staff', 'Staff'), ('Alumni', 'Alumni'), ('Parent/Guardian', 'Parent/Guardian'), ('Supplier/Provider', 'Supplier/Provider'), ('Visitor', 'Visitor')], default='Faculty', max_length=50)),
                ('region', models.CharField(choices=[('NCR', 'NCR (National Capital Region)'), ('CAR', 'CAR (Cordillera Administrative Region)'), ('Region I', 'Region I (Ilocos Region)'), ('Region II', 'Region II (Cagayan Valley)'), ('Region III', 'Region III (Central Luzon)'), ('Region IV-A', 'Region IV-A (CALABARZON)'), ('Region IV-B', 'Region IV-B (MIMAROPA)'), ('Region V', 'Region V (Bicol Region)'), ('Region VI', 'Region VI (Western Visayas)'), ('Region VII', 'Region VII (Central Visayas)'), ('Region VIII', 'Region VIII (Eastern Visayas)'), ('Region IX', 'Region IX (Zamboanga Peninsula)'), ('Region X', 'Region X (Northern Mindanao)'), ('Region XI', 'Region XI (Davao Region)'), ('Region XII', 'Region XII (SOCCSKSARGEN)'), ('Region XIII', 'Region XIII (Caraga)'), ('BARMM', 'BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)')], default='Region XII', max_length=50)),
                ('sex', models.CharField(choices=[('Male', 'Male'), ('Female', 'Female')], default='Male', max_length=6)),
                ('age', models.PositiveIntegerField()),
                ('transaction_types', models.JSONField()),
                ('suggestions', models.TextField(blank=True, null=True)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('evaluator', models.CharField(blank=True, null=True)),
                ('others', models.CharField(blank=True, null=True)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('sqd0', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd1', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd2', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd3', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd4', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd5', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd6', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd7', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
                ('sqd8', models.IntegerField(blank=True, choices=[(1, 'Strongly Disagree'), (2, 'Disagree'), (3, 'Neither Agree nor Disagree'), (4, 'Agree'), (5, 'Strongly Agree'), (0, 'Not Applicable')], null=True)),
            ],
        ),
    ]

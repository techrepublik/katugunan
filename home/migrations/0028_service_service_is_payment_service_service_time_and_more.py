# Generated by Django 4.2.16 on 2025-04-04 11:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0027_clientsurvey_services'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='service_is_payment',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='service',
            name='service_time',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='service',
            name='service_type',
            field=models.CharField(choices=[('Internal', 'Internal'), ('External', 'External'), ('All', 'All')], default='Internal', max_length=50),
        ),
    ]

# Generated by Django 4.2.16 on 2025-04-04 17:26

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0028_service_service_is_payment_service_service_time_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Branch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('branch_name', models.CharField(max_length=250)),
                ('branch_short_name', models.CharField(max_length=100)),
                ('branch_address', models.CharField(blank=True, max_length=250, null=True)),
            ],
            options={
                'ordering': ['branch_short_name'],
            },
        ),
        migrations.AddField(
            model_name='unit',
            name='branch',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='home.branch'),
        ),
    ]

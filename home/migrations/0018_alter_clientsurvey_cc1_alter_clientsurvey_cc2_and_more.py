# Generated by Django 4.2.16 on 2024-11-06 22:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0017_alter_department_options_clientsurvey_latitude_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clientsurvey',
            name='cc1',
            field=models.CharField(choices=[('1', 'I know what a CC is and I saw this office’s CC.'), ('2', 'I know what a CC is but I did NOT see this office’s CC.'), ('3', 'I know what a CC is but I did NOT see this office’s CC.'), ('4', 'I do not know what a CC is and I did NOT see one in this office.')], default=1, help_text='Which of the following best describes your awareness of CC?', max_length=1, verbose_name='Awareness of CC'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='clientsurvey',
            name='cc2',
            field=models.CharField(choices=[('1', 'Easy to see'), ('2', 'Somewhat easy to see'), ('3', 'Difficult to see'), ('4', 'Not visible at all'), ('5', 'N/A')], default=1, help_text='If aware of CC, would you say that the CC of this office was...?', max_length=1, verbose_name='Visibility of CC'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='clientsurvey',
            name='cc3',
            field=models.CharField(choices=[('1', 'Helped very much'), ('2', 'Somewhat helped'), ('3', 'Did not help'), ('4', 'N/A')], default=1, help_text='If aware of CC, how much did the CC help you in your transaction?', max_length=1, verbose_name='Effectiveness of CC'),
            preserve_default=False,
        ),
    ]

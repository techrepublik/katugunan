# Generated manually: copy legacy qrcode file to qrcode_image, then drop qrcode.

from django.db import migrations


def copy_qrcode_to_qrcode_image(apps, schema_editor):
    CustomUser = apps.get_model('home', 'CustomUser')
    for u in CustomUser.objects.all():
        if u.qrcode and not u.qrcode_image:
            u.qrcode_image = u.qrcode
            u.save(update_fields=['qrcode_image'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0036_customuser_qrcode_image'),
    ]

    operations = [
        migrations.RunPython(copy_qrcode_to_qrcode_image, noop_reverse),
        migrations.RemoveField(
            model_name='customuser',
            name='qrcode',
        ),
    ]

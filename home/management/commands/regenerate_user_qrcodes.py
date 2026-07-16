from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = (
        'Rewrite every user QR PNG so it encodes the canonical qrcode_url '
        '(PUBLIC_BASE_URL + user_id). Use after changing PUBLIC_BASE_URL or '
        'fixing older QR images that did not match the URL field.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--use-stored-url',
            action='store_true',
            help=(
                'Encode the existing qrcode_url field when set instead of '
                'recalculating from PUBLIC_BASE_URL (still refreshes the PNG).'
            ),
        )

    def handle(self, *args, **options):
        User = get_user_model()
        use_stored = options['use_stored_url']
        updated = 0
        for user in User.objects.all().iterator():
            if use_stored and user.qrcode_url:
                user._sync_user_qrcode(use_existing_qrcode_url=True)
            else:
                user._sync_user_qrcode()
            updated += 1
        self.stdout.write(
            self.style.SUCCESS(f'Regenerated QR codes for {updated} user(s).')
        )

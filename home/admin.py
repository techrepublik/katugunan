from django.contrib import admin
from django.utils.html import format_html
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Unit, Department, Question, ClientSurvey


class CustomUserAdmin(UserAdmin):
    model = CustomUser

    def save_model(self, request, obj, form, change):
        obj.save(refresh_qrcode=change)

    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('id_number', 'sex', 'user_id', 'birth_date',
         'registered_on', 'department', 'picture', 'qrcode_image', 'qrcode_url')}),
    )
    readonly_fields = ['qrcode_image']

    def qrcode_display(self, obj):
        if obj.qrcode_image:
            return format_html('<img src="{}" width="100" height="100" />', obj.qrcode_image.url)
        return "No QR Code"

    qrcode_display.short_description = 'QR Code'


admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Department)
admin.site.register(Unit)
admin.site.register(Question)
admin.site.register(ClientSurvey)

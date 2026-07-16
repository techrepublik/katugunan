from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect
from functools import wraps
from .models import ClientSurvey, CustomUser

def get_filtered_surveys(request):
    """
    Helper function to filter ClientSurvey queryset based on the user's role (RBAC).
    - Super / Admin: Can see all surveys.
    - Unit: Can only see surveys for users belonging to their Unit.
    - Others / Anonymous: No surveys.
    """
    user = request.user
    surveys = ClientSurvey.objects.all()
    if not user.is_authenticated:
        return surveys.none()
    if user.is_superuser or user.user_level in ['Super', 'Admin']:
        return surveys
    if user.user_level == 'Unit':
        if user.department and user.department.unit_id:
            unit_user_ids = CustomUser.objects.filter(
                department__unit_id=user.department.unit_id
            ).values_list('user_id', flat=True)
            return surveys.filter(user_id__in=unit_user_ids)
        return surveys.none()
    return surveys.none()

def role_required(allowed_levels):
    """
    Decorator for views that checks if the logged-in user has a role in the allowed_levels.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('home:login')
            if request.user.is_superuser or request.user.user_level in allowed_levels:
                return view_func(request, *args, **kwargs)
            raise PermissionDenied
        return _wrapped_view
    return decorator

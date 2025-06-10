# views.py
from django.http import JsonResponse
from django.shortcuts import render, get_list_or_404
from django.utils.dateparse import parse_date
from django.db.models import Q, Count, OuterRef, Subquery, Avg
from .models import CustomUser, ClientSurvey

def user_data_api(request):
    draw = int(request.GET.get("draw", 1))
    start = int(request.GET.get("start", 0))
    length = int(request.GET.get("length", 10))
    search_value = request.GET.get("search[value]", "")

    # Filters
    sex_filter = request.GET.get("sex", "")
    region_filter = request.GET.get("region", "")
    start_date = request.GET.get("start_date", "")
    end_date = request.GET.get("end_date", "")

    # Parse date filters safely
    start_date_obj = parse_date(start_date) if start_date else None
    end_date_obj = parse_date(end_date) if end_date else None

    # Subquery: Filtered survey counts by created_on
    filtered_surveys = ClientSurvey.objects.filter(user_id=OuterRef("user_id"))
    if start_date_obj:
        filtered_surveys = filtered_surveys.filter(created_on__date__gte=start_date_obj)
    if end_date_obj:
        filtered_surveys = filtered_surveys.filter(created_on__date__lte=end_date_obj)

    survey_counts = filtered_surveys.values("user_id") \
        .annotate(count=Count("id")) \
        .values("count")

    # Main queryset with annotations
    query = CustomUser.objects.annotate(
        survey_count=Subquery(survey_counts[:1])
    )

    # Filter by sex
    if sex_filter:
        query = query.filter(sex=sex_filter)

    # Filter by region (through ClientSurvey.user_id)
    if region_filter:
        region_user_ids = ClientSurvey.objects.filter(region=region_filter).values_list("user_id", flat=True)
        query = query.filter(user_id__in=region_user_ids)

    # Filter by users who have surveys in selected date range
    if start_date_obj or end_date_obj:
        date_user_ids = filtered_surveys.values_list("user_id", flat=True).distinct()
        query = query.filter(user_id__in=date_user_ids)

    # Global search (optional)
    if search_value:
        query = query.filter(
            Q(username__icontains=search_value) |
            Q(email__icontains=search_value) |
            Q(first_name__icontains=search_value) |
            Q(last_name__icontains=search_value)
        )

    total = query.count()
    users = query[start:start + length]

    # Prepare data
    data = [
        {
            "user_id": u.user_id,
            "username": u.username,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "sex": u.sex,
            "registered_on": u.registered_on.strftime('%Y-%m-%d'),
            "survey_count": u.survey_count or 0
        }
        for u in users
    ]

    return JsonResponse({
        "draw": draw,
        "recordsTotal": total,
        "recordsFiltered": total,
        "data": data,
    })

def user_table_view(request):
    return render(request, "surveys/results//user_list.html")


def survey_user_stat_detail(request, user_id):
    surveys = ClientSurvey.objects.filter(user_id=user_id)

    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    print(start_date)

    if start_date:
        surveys = surveys.filter(created_on__gte=parse_date(start_date))
    if end_date:
        surveys = surveys.filter(created_on__lte=parse_date(end_date))


    if not surveys.exists():
        return JsonResponse({
            "user_id": user_id,
            "total_surveys": 0,
            "region": "N/A",
            "sex": "N/A",
            "sqd_averages": {},
            "feedbacks": [],
        })

    first = surveys.first()
    sqd_fields = [f'sqd{i}' for i in range(9)]

    averages = surveys.aggregate(**{
        f'sqd{i}': Avg(f'sqd{i}') for i in range(9)
    })

    avg_cleaned = {k: round(v, 2) if v is not None else 0 for k, v in averages.items()}

    try:
        user = CustomUser.objects.select_related('department__unit_id', 'position').get(user_id=user_id)
    except CustomUser.DoesNotExist:
        user = None

    # Get feedback data as a list of dicts
    feedbacks = [{"suggestion": s.suggestions, "email": s.email} for s in surveys if s.suggestions]

    return JsonResponse({
        "user_id": user_id,
        "total_surveys": surveys.count(),
        "region": first.region,
        "sex": first.sex,
        "sqd_averages": avg_cleaned,
        "last_name": user.last_name if user else "",
        "first_name": user.first_name if user else "",
        "middle_name": user.middle_name if user else "",
        "email": user.email if user else "",
        "department": user.department.department_name if user and user.department else "",
        "unit": user.department.unit_id.unit_name if user and user.department and user.department.unit_id else "",
        "position": user.position.position_name if user and user.position else "",
        "picture_url": user.picture.url if user and user.picture else None,
        "feedbacks": feedbacks,
    })
import random
from django.http import JsonResponse
from django.db.models.functions import TruncMonth
from django.db.models import Count
from collections import defaultdict
from django.db.models.functions import ExtractYear
from django.shortcuts import render
from .models import *

def cc_bar_chart_view(request):
    # Choice labels
    cc1_labels = {
        '1': "I know what a CC is and I saw this office’s CC.",
        '2': "I know what a CC is but I did NOT see this office’s CC.",
        '3': "I know what a CC is but I did NOT see this office’s CC.",
        '4': "I do not know what a CC is and I did NOT see one in this office.",
    }

    cc2_labels = {
        '1': "Easy to see",
        '2': "Somewhat easy to see",
        '3': "Difficult to see",
        '4': "Not visible at all",
        '5': "N/A",
    }

    cc3_labels = {
        '1': "Helped very much",
        '2': "Somewhat helped",
        '3': "Did not help",
        '4': "N/A",
    }

    # Count occurrences
    cc1_counts = defaultdict(int)
    cc2_counts = defaultdict(int)
    cc3_counts = defaultdict(int)

    for survey in ClientSurvey.objects.values('cc1', 'cc2', 'cc3'):
        if survey['cc1']:
            cc1_counts[survey['cc1']] += 1
        if survey['cc2']:
            cc2_counts[survey['cc2']] += 1
        if survey['cc3']:
            cc3_counts[survey['cc3']] += 1

    # Structure data for template
    context = {
        'cc1_labels': list(cc1_labels.values()),
        'cc1_data': [cc1_counts.get(k, 0) for k in cc1_labels.keys()],
        'cc2_labels': list(cc2_labels.values()),
        'cc2_data': [cc2_counts.get(k, 0) for k in cc2_labels.keys()],
        'cc3_labels': list(cc3_labels.values()),
        'cc3_data': [cc3_counts.get(k, 0) for k in cc3_labels.keys()],
    }

    return JsonResponse(context)

def sqd_bar_chart_view(request):

    # SQD fields
    sqd_fields = [f'sqd{i}' for i in range(9)]

    # Label mapping
    labels = {
        1: 'Strongly Disagree',
        2: 'Disagree',
        3: 'Neutral',
        4: 'Agree',
        5: 'Strongly Agree',
        0: 'N/A',
    }

    # Initialize counts
    sqd_counts = {field: defaultdict(int) for field in sqd_fields}

    # Query data
    surveys = ClientSurvey.objects.values(*sqd_fields)
    for survey in surveys:
        for field in sqd_fields:
            value = survey[field]
            if value is not None:
                sqd_counts[field][value] += 1

    # Prepare data for template
    chart_data = []
    for field in sqd_fields:
        chart_data.append({
            'label': field.upper(),
            'data': [sqd_counts[field].get(i, 0) for i in range(6)],  # 0-5
        })

    context = {
        'labels': [labels[i] for i in range(6)],
        'chart_data': chart_data,
    }
    return JsonResponse(context)

def cc_combined_bar_chart_view(request):
    year = request.GET.get('year_citizen')
    # print(year)
    if year:
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()

    # Response option keys (as strings for uniformity)
    response_keys = ['1', '2', '3', '4', '5']

    # Unified label descriptions (for x-axis categories)
    response_labels = {
        '1': 'Option 1',
        '2': 'Option 2',
        '3': 'Option 3',
        '4': 'Option 4',
        '5': 'N/A'
    }

    # Count occurrences
    cc1_counts = defaultdict(int)
    cc2_counts = defaultdict(int)
    cc3_counts = defaultdict(int)

    for survey in surveys.values('cc1', 'cc2', 'cc3'):
        if survey['cc1']:
            cc1_counts[survey['cc1']] += 1
        if survey['cc2']:
            cc2_counts[survey['cc2']] += 1
        if survey['cc3']:
            cc3_counts[survey['cc3']] += 1

    context = {
        'response_labels': [response_labels[k] for k in response_keys],
        'cc1_data': [cc1_counts.get(k, 0) for k in response_keys],
        'cc2_data': [cc2_counts.get(k, 0) for k in response_keys],
        'cc3_data': [cc3_counts.get(k, 0) for k in response_keys],
    }

    return JsonResponse(context)

def combined_sqd_chart_view(request):
    year = request.GET.get('year_sqd')
    # print(year)
    if year:
        data = ClientSurvey.objects.filter(created_on__year=year)
    else:
        data = ClientSurvey.objects.all()

    sqd_fields = [f'sqd{i}' for i in range(9)]

    # Labels for x-axis
    rating_labels = {
        1: 'Strongly Disagree',
        2: 'Disagree',
        3: 'Neutral',
        4: 'Agree',
        5: 'Strongly Agree',
        0: 'N/A',
    }

    # Prepare counts
    sqd_counts = {field: defaultdict(int) for field in sqd_fields}
    surveys = data.values(*sqd_fields)
    for survey in surveys:
        for field in sqd_fields:
            value = survey[field]
            if value is not None:
                sqd_counts[field][value] += 1

    # Create dataset for Chart.js
    chart_datasets = []
    for field in sqd_fields:
        chart_datasets.append({
            'label': field.upper(),
            'data': [sqd_counts[field].get(i, 0) for i in rating_labels.keys()],
        })

    context = {
        'labels': list(rating_labels.values()),
        'datasets': chart_datasets,
    }

    return JsonResponse(context)

def survey_per_month_chart(request):
    year = request.GET.get('year_survey')
    # print(year)
    if year:
        data = ClientSurvey.objects.filter(created_on__year=year)
    else:
        data = ClientSurvey.objects.all()

    # Group surveys by month using TruncMonth
    monthly_data = (
        data.annotate(month=TruncMonth('created_on'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Extract labels and data
    labels = [entry['month'].strftime("%B %Y") for entry in monthly_data]
    data = [entry['count'] for entry in monthly_data]

    context = {
        'labels': labels,
        'data': data,
    }

    return JsonResponse(context)

def region_monthly_modal(request):
    # years = ClientSurvey.objects.dates('created_on', 'year').distinct()
    years = ClientSurvey.objects.annotate(year=ExtractYear(
        'created_on')).values('year').distinct().order_by('-year')
    # year_list = sorted(set(dt.year for dt in years))
    return render(request, 'surveys/modals/region.html', {
        'years': years
    })

def region_monthly_survey_chart(request):
    year = request.GET.get('year')
    if year:
        year = int(year)
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()


    data = (
        surveys
        .annotate(month=TruncMonth('created_on'))
        .values('month', 'region')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Step 1: Get distinct datetime objects (not strings)
    month_dates = sorted(set(entry['month'] for entry in data))  # list of actual datetime objects

    # Step 2: Format them after sorting
    months = [month.strftime('%B %Y') for month in month_dates]
    month_index = {label: i for i, label in enumerate(months)}
    regions = [r[0] for r in ClientSurvey.REGIONS]
    region_data = {region: [0] * len(months) for region in regions}

    for entry in data:
        month_label = entry['month'].strftime('%B %Y')
        region = entry['region']
        if region in region_data:
            region_data[region][month_index[month_label]] = entry['count']

    # datasets = [{
    #     'label': region,
    #     'data': region_data[region],
    #     'fill': False,
    #     'tension': 0.3
    # } for region in regions]

    datasets = []
    for region in regions:
        color = f"rgba({random.randint(0,255)}, {random.randint(0,255)}, {random.randint(0,255)}, 0.7)"
        datasets.append({
            'label': region,
            'data': region_data[region],
            'borderColor': color,
            'backgroundColor': color,
            'fill': False,
            'tension': 0.3,
        })

    context = {
        'labels': months,
        'datasets': datasets,
    }
    return JsonResponse(context)

def region_monthly_by_dept_unit_chart(request):
    year = request.GET.get('year')
    if year:
        year = int(year)
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()

    data = (
        surveys
        .annotate(month=TruncMonth('created_on'))
        .values('month', 'user_id')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    data1 = (
        surveys
        .annotate(month=TruncMonth('created_on'))
        .values('month', 'user_id')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Get user_id -> (unit, department) mapping
    users = CustomUser.objects.select_related('department__unit_id')
    user_map = {
        user.user_id: {
            'unit': user.department.unit_id.unit_short_name if user.department and user.department.unit_id else 'N/A',
            'department': user.department.department_name if user.department else 'N/A'
        } for user in users
    }

    # Step 3: Group by (month, unit, department) and sum counts
    grouped = defaultdict(int)
    for entry in data:
        user_info = user_map.get(entry['user_id'], {'unit': 'Unknown', 'department': 'Unknown'})
        key = (
            entry['month'].strftime('%B %Y'),
            user_info['unit'],
            user_info['department']
        )
        grouped[key] += entry['count']

    # Step 4: Prepare final JSON response
    summary = [
        {
            'month': month,
            'unit': unit,
            'department': dept,
            'count': count
        }
        for (month, unit, dept), count in grouped.items()
    ]

    # Optional: sort by month
    summary.sort(key=lambda x: x['month'])


    user_map = {
        user.user_id: {
            'department': user.department.department_name if user.department else 'Unknown',
            'unit': user.department.unit_id.unit_name if user.department and user.department.unit_id else 'Unknown'
        }
        for user in CustomUser.objects.select_related('department__unit_id')
    }

    month_dates = sorted(set(entry['month'] for entry in data if entry['month']))
    months = [month.strftime('%B %Y') for month in month_dates]
    month_index = {label: i for i, label in enumerate(months)}

    grouped_data = defaultdict(lambda: [0] * len(months))

    for entry in data:
        user_id = entry['user_id']
        count = entry['count']
        month_label = entry['month'].strftime('%B %Y')

        if user_id in user_map:
            dept = user_map[user_id]['department']
            unit = user_map[user_id]['unit']
            key = f"{unit} - {dept}"
            grouped_data[key][month_index[month_label]] += count

    datasets = []
    for label, counts in grouped_data.items():
        color = f"rgba({random.randint(0,255)}, {random.randint(0,255)}, {random.randint(0,255)}, 0.7)"
        datasets.append({
            'label': label,
            'data': counts,
            'borderColor': color,
            'backgroundColor': color,
            'fill': False,
            'tension': 0.3,
        })

    return JsonResponse({
        'labels': months,
        'datasets': datasets,
        'summary': summary,
    })


### citizen charter
def cc_monhtly_modal(request):
    return render(request, 'surveys/modals/citizen_charter.html')



### sqd chart
def sqd_chart_modal(request):
    # years = ClientSurvey.objects.dates('created_on', 'year').distinct()
    years = ClientSurvey.objects.annotate(year=ExtractYear(
        'created_on')).values('year').distinct().order_by('-year')
    # year_list = sorted(set(dt.year for dt in years))
    return render(request, 'surveys/modals/sqd_chart.html', {
        'years': years
    })

def sqd_chart_modal_view(request):
    try:
        year = int(request.GET.get('year_sqd', 0))
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Invalid year format'}, status=400)

    data = ClientSurvey.objects.filter(created_on__year=year) if year else ClientSurvey.objects.all()

    sqd_fields = [f'sqd{i}' for i in range(9)]
    rating_labels = {
        1: 'Strongly Disagree',
        2: 'Disagree',
        3: 'Neutral',
        4: 'Agree',
        5: 'Strongly Agree',
        0: 'N/A',
    }

    surveys = data.values('user_id', *sqd_fields)

    user_map = {
        user.user_id: {
            'unit': user.department.unit_id.unit_short_name if user.department and user.department.unit_id else 'N/A',
            'department': user.department.department_name if user.department else 'N/A'
        }
        for user in CustomUser.objects.select_related('department__unit_id')
    }

    grouped_counts = defaultdict(lambda: {field: defaultdict(int) for field in sqd_fields})
    for survey in surveys:
        user_id = survey.get('user_id')
        unit = user_map.get(user_id, {}).get('unit', 'Unknown')
        dept = user_map.get(user_id, {}).get('department', 'Unknown')
        group = f"{unit} - {dept}"

        for field in sqd_fields:
            value = survey.get(field)
            if value is not None:
                grouped_counts[group][field][value] += 1

    chart_data = {
        'labels': list(rating_labels.values()),
        'datasets': []
    }

    for group, field_counts in grouped_counts.items():
        summed = [0] * len(rating_labels)
        for field in sqd_fields:
            for idx, rating in enumerate(rating_labels.keys()):
                summed[idx] += field_counts[field].get(rating, 0)

        chart_data['datasets'].append({
            'label': group,
            'data': summed
        })

    return JsonResponse(chart_data)

def sqd_grouped_by_unit_department_view(request):
    year = request.GET.get('year_sqd')
    data = ClientSurvey.objects.filter(created_on__year=year) if year else ClientSurvey.objects.all()

    sqd_fields = [f'sqd{i}' for i in range(9)]
    rating_labels = {
        1: 'Strongly Disagree',
        2: 'Disagree',
        3: 'Neutral',
        4: 'Agree',
        5: 'Strongly Agree',
        0: 'N/A',
    }

    surveys = data.values('user_id', *sqd_fields)

    # map user_id to unit + department
    user_map = {
        user.user_id: {
            'unit': user.department.unit_id.unit_short_name if user.department and user.department.unit_id else 'N/A',
            'department': user.department.department_name if user.department else 'N/A'
        }
        for user in CustomUser.objects.select_related('department__unit_id')
    }

    # group by unit-dept and count total responses per rating
    from collections import defaultdict
    group_counts = defaultdict(lambda: defaultdict(int))

    for survey in surveys:
        user_id = survey.get('user_id')
        unit = user_map.get(user_id, {}).get('unit', 'Unknown')
        dept = user_map.get(user_id, {}).get('department', 'Unknown')
        label = f"{unit} - {dept}"

        for field in sqd_fields:
            value = survey.get(field)
            if value is not None:
                group_counts[label][value] += 1

    # prepare Chart.js structure
    response_types = list(rating_labels.keys())
    chart_data = {
        'labels': list(group_counts.keys()),
        'datasets': []
    }

    for rating in response_types:
        chart_data['datasets'].append({
            'label': rating_labels[rating],
            'data': [group_counts[group].get(rating, 0) for group in chart_data['labels']]
        })

    return JsonResponse(chart_data)

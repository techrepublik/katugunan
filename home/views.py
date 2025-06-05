import os
import json
from django.http.response import HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password
from django.db.models import Count, Avg, Q
from collections import Counter
from itertools import chain
from django.views.decorators.http import require_GET
from django.db.models.functions import ExtractYear
from django.db.models import Count
from collections import defaultdict
from .models import Question, Unit, Department, \
    Question, CustomUser, Rating, Position, Service, Branch, ClientSurvey
from .forms import QuestionForm, UnitForm, DepartmentForm, UserForm, \
    RatingForm,  Rating, YearSelectionForm, \
    CustomAuthenticationForm, ClientSurveyForm, ClientSurvey, PositionForm, ServiceForm, \
    BranchForm, CustomUserPasswordChangeForm


User = get_user_model()


@login_required(login_url='home:login')
def dashboard_view(request):

    surveys = ClientSurvey.objects.all()
    ratings = Rating.objects.all()
    users = User.objects.count()
    services = Service.objects.count()
    units = Unit.objects.count()
    departments = Department.objects.count()

    # Aggregate data for summaries
    total_surveys = surveys.count()
    average_rating = Rating.objects.aggregate(
        Avg('rating')).get('rating__avg')
    # survey_by_region = surveys.values(
    #     'region').annotate(total=Count('id')).order_by('-total')
    # recent_surveys = ratings.all().order_by(
    #     '-created_at')[:5]  # last 5 surveys

    # Extract unique years from the ClientSurvey created_on field
    years = surveys.annotate(year=ExtractYear(
        'created_on')).values('year').distinct().order_by('-year')

    # # Count male and female entries
    # gender_counts = surveys.values(
    #     'sex').annotate(total=Count('sex'))
    # for entry in gender_counts:
    #     if entry['sex'] == 'Male':
    #         male_count = entry['total']
    #     elif entry['sex'] == 'Female':
    #         female_count = entry['total']

    # # Count each transaction type across all surveys
    # transaction_counts = Counter(
    #     chain.from_iterable(surveys.values_list(
    #         'transaction_types', flat=True))
    # )

    # # Pass context to template
    context = {
        'total_surveys': total_surveys,
        'average_rating': average_rating,
        # 'survey_by_region': survey_by_region,
        # 'recent_surveys': recent_surveys,
        # 'transaction_counts': dict(transaction_counts),
        # 'male_count': male_count,
        # 'female_count': female_count,
        'years': years,
        'users': users,
        'services': services,
        'units': units,
        'departments': departments,
    }
    return render(request, 'dashboard.html', context)


def populate_dashboard(request):
    year = request.GET.get('year_transaction')

    if year:
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()

    # Count each transaction type across all surveys
    transaction_counts = Counter(
        chain.from_iterable(surveys.values_list(
            'transaction_types', flat=True))
    )

    # Pass context to template
    data = {
        'transaction_counts': dict(transaction_counts),
    }

    # print(data)
    return JsonResponse(data)


def populate_dashboard_region(request):
    year = request.GET.get('year_region')

    if year:
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()

    survey_by_region = surveys.values(
        'region').annotate(total=Count('id')).order_by('-total')

    # Pass context to template
    data = {
        'survey_by_region': list(survey_by_region),
    }

    return JsonResponse(data)


def populate_dashboard_gender(request):
    year = request.GET.get('year_sex')

    if year:
        genders = CustomUser.objects.values('sex').annotate(
            count=Count('id')).filter(registered_on__year=year)
    else:
        genders = CustomUser.objects.values('sex').annotate(count=Count('id'))

    labels = []
    counts = []

    for entry in genders:
        if entry['sex'] == 'M':
            labels.append('Male')
        elif entry['sex'] == 'F':
            labels.append('Female')
        else:
            labels.append('Unspecified')
        counts.append(entry['count'])

    print(genders)

    context = {
        'labels': labels,
        'counts': counts,
    }

    return JsonResponse(context)


@require_GET
def citizen_year(request):
    # Fetch unique years from ClientSurvey to populate the dropdown
    years = ClientSurvey.objects.dates('created_on', 'year', order='DESC')

    # Render the main page with only the dropdown initially
    return render(request, 'survey_summary.html', {'years': years})


@require_GET
def citizen_chart_data(request):
    # Aggregate data for CC1, CC2, and CC3 based on the selected year
    year = request.GET.get('year_citizen')
    # print(year)
    if year:
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()

    # Aggregate data for cc1, cc2, and cc3
    cc1_data = surveys.values('cc1').annotate(total=Count('cc1'))
    cc2_data = surveys.values('cc2').annotate(total=Count('cc2'))
    cc3_data = surveys.values('cc3').annotate(total=Count('cc3'))

    # Convert data to lists for labels and values
    cc1_labels = [item['cc1'] for item in cc1_data]
    cc1_counts = [item['total'] for item in cc1_data]
    cc2_labels = [item['cc2'] for item in cc2_data]
    cc2_counts = [item['total'] for item in cc2_data]
    cc3_labels = [item['cc3'] for item in cc3_data]
    cc3_counts = [item['total'] for item in cc3_data]

    data = {
        'cc1_labels': cc1_labels,
        'cc1_counts': cc1_counts,
        'cc2_labels': cc2_labels,
        'cc2_counts': cc2_counts,
        'cc3_labels': cc3_labels,
        'cc3_counts': cc3_counts,
    }

    # print(data)
    # Return JSON data for HTMX response
    return JsonResponse(data)


@require_GET
def citizen_charter_chart_data(request):
    year = request.GET.get('year_citizen_charter')

    # Filter by selected year if provided, otherwise include all
    if year:
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()

    # Aggregate counts for each choice in CC1, CC2, and CC3
    cc1_data = surveys.values('cc1').annotate(
        total=Count('cc1')).order_by('cc1')
    cc2_data = surveys.values('cc2').annotate(
        total=Count('cc2')).order_by('cc2')
    cc3_data = surveys.values('cc3').annotate(
        total=Count('cc3')).order_by('cc3')

    # Define choices in the same order as model choices
    cc1_choices = [choice[1] for choice in ClientSurvey.CC1_CHOICES]
    cc2_choices = [choice[1] for choice in ClientSurvey.CC2_CHOICES]
    cc3_choices = [choice[1] for choice in ClientSurvey.CC3_CHOICES]

    data = {
        'cc1': {
            'labels': cc1_choices,
            'data': [next((item['total'] for item in cc1_data if item['cc1'] == str(i+1)), 0) for i in range(len(cc1_choices))]
        },
        'cc2': {
            'labels': cc2_choices,
            'data': [next((item['total'] for item in cc2_data if item['cc2'] == str(i+1)), 0) for i in range(len(cc2_choices))]
        },
        'cc3': {
            'labels': cc3_choices,
            'data': [next((item['total'] for item in cc3_data if item['cc3'] == str(i+1)), 0) for i in range(len(cc3_choices))]
        },
    }

    return JsonResponse(data)


def get_sqd_data(request):
    year = request.GET.get('year_sgd')

    # Filter by selected year if provided, otherwise include all
    if year:
        surveys = ClientSurvey.objects.filter(created_on__year=year)
    else:
        surveys = ClientSurvey.objects.all()

    # Aggregate counts for each choice in SATISFACTION_CHOICES across SQD fields
    satisfaction_data = {
        choice[1]: 0 for choice in ClientSurvey.SATISFACTION_CHOICES}
    sqd_fields = [f'sqd{i}' for i in range(9)]

    for field in sqd_fields:
        field_data = surveys.values(
            field).annotate(count=Count(field))
        for entry in field_data:
            choice = entry[field]
            count = entry['count']
            if choice is not None:
                satisfaction_label = dict(
                    ClientSurvey.SATISFACTION_CHOICES).get(choice, "N/A")
                satisfaction_data[satisfaction_label] += count

    labels = list(satisfaction_data.keys())
    data = list(satisfaction_data.values())

    # print(labels)

    return JsonResponse({'labels': labels, 'data': data})


def survey_summary(request):
    year_selected = None
    form = YearSelectionForm(request.GET or None)

    # Initialize empty data dictionaries
    cc1_data, cc2_data, cc3_data = {}, {}, {}

    if form.is_valid():
        year_selected = form.cleaned_data['year']

        # Filter surveys by the selected year
        surveys = ClientSurvey.objects.filter(created_on__year=year_selected)

        # Aggregate counts for each choice in cc1, cc2, and cc3
        cc1_data = dict(surveys.values_list(
            'cc1').annotate(count=Count('cc1')))
        cc2_data = dict(surveys.values_list(
            'cc2').annotate(count=Count('cc2')))
        cc3_data = dict(surveys.values_list(
            'cc3').annotate(count=Count('cc3')))

    # Prepare the data for Chart.js
    chart_data = {
        'labels': ["Choice 1", "Choice 2", "Choice 3", "Choice 4", "N/A"],
        'cc1_data': [cc1_data.get(str(i), 0) for i in range(1, 5)] + [cc1_data.get('5', 0)],
        'cc2_data': [cc2_data.get(str(i), 0) for i in range(1, 5)] + [cc2_data.get('5', 0)],
        'cc3_data': [cc3_data.get(str(i), 0) for i in range(1, 5)] + [cc3_data.get('5', 0)],
    }

    return render(request, 'survey_summary.html', {'form': form, 'chart_data': json.dumps(chart_data), 'year_selected': year_selected})


def manage_surveys_view(request):
    return render(request, 'manage_surveys.html')


def feedback_view(request):
    return render(request, 'feedback.html')


# Users
def user_create(request):
    if request.method == 'POST':
        print("POST data:", request.POST)
        form = UserForm(request.POST, request.FILES)
        if form.is_valid():
            print("Cleaned data:", form.cleaned_data)
            user = form.save(commit=False)
            user.save()  # Save first to ensure `id` is assigned
            if 'picture' in request.FILES:
                user.picture = request.FILES['picture']
                user.save()  # Save again to store the file with the custom name
            return redirect('home:user_list')
        else:
            print(form.errors)
    else:
        form = UserForm()
    return render(request, 'users/user_form.html', {'form': form})


def user_update(request, pk):
    user = get_object_or_404(User, pk=pk)
    if request.method == 'POST':
        form = UserForm(request.POST, request.FILES, instance=user)
        if form.is_valid():
            user = form.save(commit=False)
            if form.cleaned_data["password"]:
                user.password = make_password(form.cleaned_data["password"])

            if 'picture' in request.FILES:
                # Delete the old picture file if it exists
                if user.picture:
                    old_picture_path = user.picture.path
                    if os.path.isfile(old_picture_path):
                        os.remove(old_picture_path)

                # Assign the new picture
                user.picture = request.FILES['picture']

            # Save the user with the new picture
            user.save()
            return redirect('home:user_list')
    else:
        form = UserForm(instance=user)
    return render(request, 'users/user_form.html', {'form': form, 'user': user})


def user_delete(request, pk):
    user = get_object_or_404(User, pk=pk)
    if request.method == 'POST':
        user.delete()
        return redirect('home:user_list')
    return render(request, 'users/user_confirm_delete.html', {'user': user})


def user_list(request):
    users = User.objects.all()
    if request.headers.get('HX-Request'):
        return render(request, 'users/user_list.html', {'users': users})
    return render(request, 'users/user_list.html', {'users': users})


def user_create1(request):
    if request.method == 'POST':
        print(request.POST)
        form = UserForm(request.POST, request.FILES)
        if form.is_valid():
            print(form.cleaned_data)
            user = form.save(commit=False)
            if form.cleaned_data["password"]:
                user.password = make_password(form.cleaned_data["password"])
            user.save()
            return render(request, 'users/user_row.html', {'user': user})
        else:
            print(form.errors)
    else:
        form = UserForm()
    return render(request, 'users/user_form.html', {'form': form})


def user_update1(request, pk):
    user = get_object_or_404(User, pk=pk)
    if request.method == 'POST':
        form = UserForm(request.POST, request.FILES, instance=user)
        if form.is_valid():
            user = form.save(commit=False)
            if form.cleaned_data["password"]:
                user.password = make_password(form.cleaned_data["password"])
            user.save()
            return render(request, 'users/user_row.html', {'user': user})
    else:
        form = UserForm(instance=user)
    return render(request, 'users/user_form.html', {'form': form})


@ require_http_methods(['DELETE'])
def user_delete(request, pk):
    user = get_object_or_404(User, pk=pk)
    user.delete()
    return HttpResponse(status=200)


# Unit Views
# def unit_list(request):
#     print("1")
#     units = Unit.objects.all()
#     return render(request, 'units/unit_list.html', {'units': units})
def unit_list(request):
    units = Unit.objects.all()
    # Check if it's an HTMX request
    if request.headers.get('HX-Request'):
        return render(request, 'units/unit_list_partial.html', {'units': units})
    return render(request, 'units/unit_list.html', {'units': units})


def unit_create1(request):
    if request.method == 'POST':
        form = UnitForm(request.POST)
        if form.is_valid():
            unit = form.save()
            return render(request, 'units/unit_row.html',
                          {'unit': unit})
    else:
        form = UnitForm()
    return render(request, 'units/unit_form.html', {'form': form})


def unit_update(request, pk):
    unit = get_object_or_404(Unit, pk=pk)
    if request.method == 'POST':
        form = UnitForm(request.POST, instance=unit)
        if form.is_valid():
            unit = form.save()
            return render(request, 'units/unit_row.html',
                          {'unit': unit})
    else:
        form = UnitForm(instance=unit)
    return render(request, 'units/unit_form.html', {'form': form})


@ require_http_methods(['DELETE'])
def unit_delete(request, pk):
    unit = get_object_or_404(Unit, pk=pk)
    unit.delete()
    return HttpResponse(status=200)


# Branch
def branch_list(request):
    branches = Branch.objects.all()
    # Check if it's an HTMX request
    if request.headers.get('HX-Request'):
        return render(request, 'branches/branch_list_partial.html', {'branches': branches})
    return render(request, 'branches/branch_list.html', {'branches': branches})


def branch_create(request):
    if request.method == 'POST':
        form = BranchForm(request.POST)
        if form.is_valid():
            branch = form.save()
            return render(request, 'branches/branch_row.html',
                          {'branch': branch, 'success': True})
    else:
        form = BranchForm()
    return render(request, 'branches/branch_form.html', {'form': form})


def branch_update(request, pk):
    branch = get_object_or_404(Branch, pk=pk)
    if request.method == 'POST':
        form = BranchForm(request.POST, instance=branch)
        if form.is_valid():
            branch = form.save()
            return render(request, 'branches/branch_row.html', {'branch': branch})
    else:
        form = BranchForm(instance=branch)
    return render(request, 'branches/branch_form.html', {'form': form})


@ require_http_methods(['DELETE'])
def branch_delete(request, pk):
    branch = get_object_or_404(Branch, pk=pk)
    branch.delete()
    return HttpResponse(status=200)


# Department

def department_list(request):
    departments = Department.objects.all()
    # Check if it's an HTMX request
    if request.headers.get('HX-Request'):
        return render(request, 'departments/department_list_partial.html', {'departments': departments})
    return render(request, 'departments/department_list.html', {'departments': departments})


def department_create(request):
    if request.method == 'POST':
        form = DepartmentForm(request.POST)
        if form.is_valid():
            department = form.save()
            return render(request, 'departments/department_row.html',
                          {'department': department, 'success': True})
    else:
        form = DepartmentForm()
    return render(request, 'departments/department_form.html', {'form': form})


def department_update(request, pk):
    department = get_object_or_404(Department, pk=pk)
    if request.method == 'POST':
        form = DepartmentForm(request.POST, instance=department)
        if form.is_valid():
            department = form.save()
            return render(request, 'departments/department_row.html', {'department': department})
    else:
        form = DepartmentForm(instance=department)
    return render(request, 'departments/department_form.html', {'form': form})


@ require_http_methods(['DELETE'])
def department_delete(request, pk):
    department = get_object_or_404(Department, pk=pk)
    department.delete()
    return HttpResponse(status=200)

# position


def position_list(request):
    positions = Position.objects.all()
    # Check if it's an HTMX request
    if request.headers.get('HX-Request'):
        return render(request, 'positions/position_list_partial.html', {'positions': positions})
    return render(request, 'positions/position_list.html', {'positions': positions})


def position_create(request):
    if request.method == 'POST':
        form = PositionForm(request.POST)
        if form.is_valid():
            position = form.save()
            return render(request, 'positions/position_row.html',
                          {'position': position, 'success': True})
    else:
        form = PositionForm()
    return render(request, 'positions/position_form.html', {'form': form})


def position_update(request, pk):
    position = get_object_or_404(Position, pk=pk)
    if request.method == 'POST':
        form = PositionForm(request.POST, instance=position)
        if form.is_valid():
            position = form.save()
            return render(request, 'positions/position_row.html', {'position': position})
    else:
        form = PositionForm(instance=position)
    return render(request, 'positions/position_form.html', {'form': form})


@ require_http_methods(['DELETE'])
def position_delete(request, pk):
    position = get_object_or_404(Position, pk=pk)
    position.delete()
    return HttpResponse(status=200)

# services


def service_list(request):
    services = Service.objects.all()
    # Check if it's an HTMX request
    if request.headers.get('HX-Request'):
        return render(request, 'services/service_list_partial.html', {'services': services})
    return render(request, 'services/service_list.html', {'services': services})


def service_create(request):
    if request.method == 'POST':
        form = ServiceForm(request.POST)
        if form.is_valid():
            service = form.save()
            return render(request, 'services/service_row.html',
                          {'service': service, 'success': True})
    else:
        form = ServiceForm()
    return render(request, 'services/service_form.html', {'form': form})


def service_update(request, pk):
    service = get_object_or_404(Service, pk=pk)
    if request.method == 'POST':
        form = ServiceForm(request.POST, instance=service)
        if form.is_valid():
            service = form.save()
            return render(request, 'services/service_row.html', {'service': service})
    else:
        form = ServiceForm(instance=service)
    return render(request, 'services/service_form.html', {'form': form})


@ require_http_methods(['DELETE'])
def service_delete(request, pk):
    service = get_object_or_404(Service, pk=pk)
    service.delete()
    return HttpResponse(status=200)


# Questions
def question_list(request):
    questions = Question.objects.all()
    # Check if it's an HTMX request
    if request.headers.get('HX-Request'):
        return render(request, 'questions/question_list_partial.html', {'questions': questions})
    return render(request, 'questions/question_list.html', {'questions': questions})


def question_create(request):
    if request.method == 'POST':
        form = QuestionForm(request.POST)
        if form.is_valid():
            question = form.save()
            return render(request, 'questions/question_row.html',
                          {'question': question, 'success': True})
    else:
        form = QuestionForm()
    return render(request, 'questions/question_form.html', {'form': form})


def question_update(request, pk):
    question = get_object_or_404(Question, pk=pk)
    if request.method == 'POST':
        form = QuestionForm(request.POST, instance=question)
        if form.is_valid():
            question = form.save()
            return render(request, 'questions/question_row.html', {'question': question})
    else:
        form = QuestionForm(instance=question)
    return render(request, 'questions/question_form.html', {'form': form})


@ require_http_methods(['DELETE'])
def question_delete(request, pk):
    question = get_object_or_404(Question, pk=pk)
    question.delete()
    return HttpResponse(status=200)


def load_survey(request, user_id):
    # user_id = request.GET.get('user_id')
    user = get_object_or_404(CustomUser, user_id=user_id)
    return render(request, 'survey_form.html', {'user': user})


def survey_form(request, user_id):
    user = get_object_or_404(CustomUser, user_id=user_id)
    if request.method == 'POST':
        form = ClientSurveyForm(request.POST, user=user)
        if form.is_valid():
            print(form.cleaned_data)
            survey = form.save(commit=False)
            survey.user_id = user_id
            if request.POST.get('latitude') and request.POST.get('longitude'):
                survey.latitude = request.POST.get('latitude')
                survey.longitude = request.POST.get('longitude')
            survey.save()  # Inserts the form data, including user_id, into the database
            form.save_m2m()  # Inserts the m2m data (services), into the database
            # Redirect to a success page or thank you page
            return redirect('home:rating_view')
        else:
            print(form.errors)
    else:
        form = ClientSurveyForm(user=user)

    sqd_statements = {
        'sqd0': "SQD0. I am satisfied with the service that I availed.",
        'sqd1': "SQD1. I spent a reasonable amount of time for my transaction.",
        'sqd2': "SQD2. The office followed the transaction's requirements and steps based on the information provided.",
        'sqd3': "SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.",
        'sqd4': "SQD4. I easily found information about my transaction from the office or its website.",
        'sqd5': "SQD5. I paid a reasonable amount of fees for my transaction. (if service was free, mark 'N/A' column)",
        'sqd6': "SQD6. I feel the office was fair to everyone, or 'walang palakasan', during my transaction.",
        'sqd7': "SQD7. I was treated courteously by the staff, and (if asked for help) the staff was helpful.",
        'sqd8': "SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.",
    }
    # Attach statements to form fields
    for field_name, field in form.fields.items():
        if field_name in sqd_statements:
            field.statement = sqd_statements[field_name]

    return render(request, 'survey_form.html', {'form': form, 'user': user})


def survey_success(request):
    return render(request, 'survey_success.html')


def rating_view(request):
    if request.method == 'POST':
        form = RatingForm(request.POST)
        if form.is_valid():
            # if request.user:
            #     rating = form.save(commit=False)
            #     rating.user = request.user  # Assign the current user to the rating
            #     rating.save()
            form.save()
            # Redirect to a success or thank you page
            return redirect('home:survey_success')
    else:
        form = RatingForm()

    return render(request, 'rating_form.html', {'form': form})


# accounts
# Registration View
# def register_view(request):
#     if request.method == 'POST':
#         form = CustomUserCreationForm(request.POST)
#         if form.is_valid():
#             user = form.save()
#             login(request, user)  # Log in the user after registration
#             return redirect('home')  # Replace 'home' with your desired redirect page
#     else:
#         form = CustomUserCreationForm()
#     return render(request, 'register.html', {'form': form})

# Login View
def login_view(request):
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        # if form.is_valid():
        #     user = form.get_user()
        #     login(request, user)
        #     # Replace 'home' with your desired redirect page
        #     return redirect('home:dashboard')

        username = request.POST.get('username')
        password = request.POST.get('password')
        print(username, password)
        user = authenticate(request, username=username, password=password)
        print(user)
        if user is not None:
            login(request, user)
            return redirect('home:dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
    else:
        form = CustomAuthenticationForm()
    return render(request, 'login.html', {'form': form})


@login_required(login_url='home:login')
def logout_view(request):
    logout(request)
    return redirect('home:login')


@login_required(login_url='home:login')
def change_user_password(request, pk):
    user = get_object_or_404(CustomUser, pk=pk)

    if request.method == 'POST':
        form = CustomUserPasswordChangeForm(request.POST)
        if form.is_valid():
            new_password = form.cleaned_data['new_password']
            user.set_password(new_password)
            user.is_staff = True  # Activate as staff
            user.save()
            # Return a success partial for htmx to replace the modal body
            return render(request, 'users/user_change_password_success_partial.html', {'user': user})
        else:
            # Return the form with errors as a partial
            return render(request, 'users/user_change_password.html', {'user': user, 'form': form})
    else:
        form = CustomUserPasswordChangeForm()

    return render(request, 'users/user_change_password.html', {'user': user, 'form': form})


# Surveys
def survey_all(request):
    return render(request, 'surveys/survey_all.html')

def services_count(request):
    # services_count = ClientSurvey.objects.annotate(service_count=Count('services')).order_by('-service_count')
    # print(services_count)
    # for service in services_count:
    #     print(service.service_count)
    # return render(request, 'surveys/services_count.html', {'services_count': services_count})

    # user_last_names = {user.user_id: user.last_name for user in CustomUser.objects.all()}

    # services_count = defaultdict(int)
    # for survey in ClientSurvey.objects.prefetch_related('services') :
    #     for service in survey.services.all():
    #         key = (survey.user_id, service.service_name)
    #         services_count[key] += 1
    # print(services_count)
    # print()
    # for (user_id, service_name), count in services_count.items():
    #     last_name = user_last_names.get(user_id, 'Unknown')
    #     print(f"{user_id}, {last_name} - {service_name}: {count}")
    # return render(request, 'surveys/services_count.html', {'services_count': services_count})

    # Step 1: Build a user info map using user_id
    # user_info_map = {}
    # users = CustomUser.objects.select_related('department__unit_id')

    # for user in users:
    #     user_info_map[user.user_id] = {
    #         'last_name': user.last_name,
    #         'department': user.department.department_name if user.department else "N/A",
    #         'unit': user.department.unit_id.unit_name if user.department and user.department.unit_id else "N/A"
    #     }

    # # Step 2: Count each service per user
    # service_counter = defaultdict(int)

    # surveys = ClientSurvey.objects.prefetch_related('services')

    # for survey in surveys:
    #     for service in survey.services.all():
    #         key = (survey.user_id, service.service_name)
    #         service_counter[key] += 1

    # # Step 3: Display final results
    # for (user_id, service_name), count in service_counter.items():
    #     user_info = user_info_map.get(user_id, {
    #         'last_name': 'Unknown',
    #         'department': 'Unknown',
    #         'unit': 'Unknown'
    #     })
    #     print(
    #         f"User ID: {user_id}, Last Name: {user_info['last_name']}, "
    #         f"Department: {user_info['department']}, Unit: {user_info['unit']}, "
    #         f"Service: {service_name}, Count: {count}"
    #     )

    # Step 1: Map user_id to user details including department and unit
    user_info_map = {}
    users = CustomUser.objects.select_related('department__unit_id')

    for user in users:
        user_info_map[user.user_id] = {
            'last_name': user.last_name,
            'department': user.department.department_name if user.department else "N/A",
            'unit': user.department.unit_id.unit_name if user.department and user.department.unit_id else "N/A"
        }

    # Step 2: Count each service per user
    service_counter = defaultdict(int)
    surveys = ClientSurvey.objects.prefetch_related('services')

    for survey in surveys:
        for service in survey.services.all():
            key = (survey.user_id, service.service_name)
            service_counter[key] += 1

    # Step 3: Group by Unit -> Department -> List of service entries
    grouped_result = defaultdict(lambda: defaultdict(list))

    for (user_id, service_name), count in service_counter.items():
        info = user_info_map.get(user_id, {
            'last_name': 'Unknown',
            'department': 'Unknown',
            'unit': 'Unknown'
        })

        grouped_result[info['unit']][info['department']].append({
            'user_id': user_id,
            'last_name': info['last_name'],
            'service': service_name,
            'count': count
        })

    # Step 4: Print grouped results
    for unit, departments in grouped_result.items():
        print(f"\nUnit: {unit}")
        for department, entries in departments.items():
            print(f"  Department: {department}")
            for entry in entries:
                print(
                    f"    User ID: {entry['user_id']}, Last Name: {entry['last_name']}, "
                    f"Service: {entry['service']}, Count: {entry['count']}"
                )

    return render(request, 'surveys/services_count.html', {'services_count': services_count})

def sqd_count(request):
    # All SQD fields
    sqd_fields = [f'sqd{i}' for i in range(9)]

    # Dictionary to hold counts per field
    sqd_counts = {field: defaultdict(int) for field in sqd_fields}

    # Query all responses
    surveys = ClientSurvey.objects.all().values(*sqd_fields)

    # Count each value
    for survey in surveys:
        for field in sqd_fields:
            value = survey[field]
            if value is not None:
                sqd_counts[field][value] += 1

    # # Display the result
    # for field in sqd_fields:
    #     print(f"\n{field.upper()}:")
    #     for rating in sorted(sqd_counts[field]):
    #         print(f"  {rating}: {sqd_counts[field][rating]}")
        
    # display result with labels
    labels = {
        1: 'Strongly Disagree',
        2: 'Disagree',
        3: 'Neither Agree nor Disagree',
        4: 'Agree',
        5: 'Strongly Agree',
        0: 'Not Applicable',
    }
    for field in sqd_fields:
        print(f"\n{field.upper()}:")
        for rating in sorted(sqd_counts[field]):
            label = labels.get(rating, "Unknown")
            print(f"  {rating} ({label}): {sqd_counts[field][rating]}")
    
    return render(request, 'surveys/sqd_chart.html', {'sqd_counts': sqd_counts})
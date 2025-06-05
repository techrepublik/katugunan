from django.urls import path
from django.contrib.auth.views import LogoutView
from . import views
from . import chart_views

app_name = 'home'
urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),

    # path('register/', register_view, name='register'),
    path('users/<str:pk>/change-password/',
         views.change_user_password, name='change_user_password'),
    path('login/', views.login_view, name='login'),
    # path('logout/', LogoutView.as_view(), name='logout'),
    path('logout/', views.logout_view, name='logout'),

    #     path('survey/<str:user_id>/', SurveyWizard.as_view(FORMS), name='survey_wizard'),
    path('survey/success/', views.survey_success,
         name='survey_success'),  # Add a success view if needed
    path('rate/', views.rating_view, name='rating_view'),
    path('survey/<str:user_id>/', views.survey_form, name='survey_form'),
    #     path('survey/', views.survey_form, name='survey_form'),

    path('users/', views.user_list, name='user_list'),
    path('users/create/', views.user_create, name='user_create'),
    path('users/<int:pk>/update/', views.user_update, name='user_update'),
    path('users/<int:pk>/delete/', views.user_delete, name='user_delete'),

    path('branches/', views.branch_list, name='branch_list'),
    path('branches/create/', views.branch_create, name='branch_create'),
    path('branches/<int:pk>/update/', views.branch_update, name='branch_update'),
    path('branches/<int:pk>/delete/', views.branch_delete, name='branch_delete'),

    path('units/', views.unit_list, name='unit_list'),
    path('units/create/', views.unit_create1, name='unit_create'),
    path('units/<int:pk>/update/', views.unit_update, name='unit_update'),
    path('units/<int:pk>/delete/', views.unit_delete, name='unit_delete'),

    path('departments/', views.department_list, name='department_list'),
    path('departments/create/', views.department_create,
         name='department_create'),
    path('departments/<int:pk>/update/',
         views.department_update, name='department_update'),
    path('departments/<int:pk>/delete/',
         views.department_delete, name='department_delete'),

    path('positions/', views.position_list, name='position_list'),
    path('positions/create/', views.position_create, name='position_create'),
    path('positions/<int:pk>/update/',
         views.position_update, name='position_update'),
    path('positions/<int:pk>/delete/',
         views.position_delete, name='position_delete'),

    path('services/', views.service_list, name='service_list'),
    path('services/create/', views.service_create, name='service_create'),
    path('services/<int:pk>/update/',
         views.service_update, name='service_update'),
    path('services/<int:pk>/delete/',
         views.service_delete, name='service_delete'),

    path('questions/', views.question_list, name='question_list'),
    path('questions/create/', views.question_create,
         name='question_create'),
    path('questions/<int:pk>/update/',
         views.question_update, name='question_update'),
    path('questions/<int:pk>/delete/',
         views.question_delete, name='question_delete'),

    # dashboard
    path('populate-dashboard/', views.populate_dashboard,
         name='populate_dashboard'),
    path('populate-region/', views.populate_dashboard_region,
         name='populate_region'),
    path('populate-citizen-charter/', views.citizen_charter_chart_data,
         name='populate_citizen_charter'),
    path('populate-sgd/', views.get_sqd_data,
         name='populate_sgd'),
    path('citizen-year/', views.citizen_year, name='citizen_year'),
    path('get-citizen-chart/',
         views.citizen_chart_data, name='citizen_chart_data'),
    path('populate-gender/', views.populate_dashboard_gender,
         name='populate_gender'),


    # surveys
    path('surveys/all/', views.survey_all, name='survey_all'),
    path('surveys/services-count/', views.services_count, name='services_count'),
    path('surveys/sqd-count/', views.sqd_count, name='sqd_count'),
    path('surveys/cc-chart/', chart_views.cc_bar_chart_view, name='cc_chart_view'),
    path('surveys/sqd-chart/', chart_views.combined_sqd_chart_view, name='sqd_chart_view'),
    path('surveys/cc-combine-chart', chart_views.cc_combined_bar_chart_view, name='cc_combine_chart_view'),
    path('surveys/survey-chart-monthly/', chart_views.survey_per_month_chart, name='survey_chart_monthly_view'),

    path('surveys/region-chart-monthly-modal/', chart_views.region_monthly_modal, name='region_monhtly_modal'),
    path('surveys/region-chart-monthly-yearly/', chart_views.region_monthly_survey_chart, name='region_monhtly_survey_view'),
    path('surveys/region-unit-dept-chart-monthly-yearly/', chart_views.region_monthly_by_dept_unit_chart, name='region_unit_dept_monhtly_survey_view'),

    path('surveys/cc-chart-monthly-modal/', chart_views.cc_monhtly_modal, name='cc_monhtly_modal'),
    
    path('surveys/sqd-chart-modal/', chart_views.sqd_chart_modal, name='sqd_chart_modal'),
    path('surveys/sqd-chart-view/', chart_views.sqd_chart_modal_view, name='sqd_chart_modal_view'),
    path('surveys/sqd-chart-unit-dept-view/', chart_views.sqd_grouped_by_unit_department_view, name='sqd_chart_unit_dept_modal_view'),
]

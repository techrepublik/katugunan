# forms.py
from django import forms
from django.db.models.fields import BLANK_CHOICE_DASH
from django.forms import widgets
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Submit
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import Question, Unit, Department, \
    Transactional, Question, ClientSurvey, Rating

User = get_user_model()


class UserForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput(
    ), required=False, help_text="Leave blank if not changing the password.")
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(), required=False)
    email = forms.EmailField(required=True)
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        # fields = '__all__'
        fields = ['username', 'password', 'confirm_password', 'email', 'first_name', 'last_name', 'middle_name', 'id_number',
                  'birth_date', 'sex', 'birth_date', 'contact_no',
                  'department', 'picture'
                  ]
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter username'}),
            'password': forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Enter password'}),
            'confirm_password': forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Re-enter password'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Enter email'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter first name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter last name'}),
            'middle_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter middle name'}),
            'id_number': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter ID number'}),
            'birth_date': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'date'}),
            'contact_no': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter contact no.'}),
            'department': forms.Select(attrs={'class': 'form-control'}),
            'picture': forms.FileInput(attrs={'class': 'form-control'}),
        }

    # def clean_username(self):
    #     username = self.cleaned_data.get('username')
    #     if not username:
    #         raise forms.ValidationError("Username is required.")
    #     return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        # if User.objects.filter(email=email).exists():
        #     raise forms.ValidationError("This email is already in use.")
        # return email
        if User.objects.exclude(pk=self.instance.pk).filter(email=email).exists():
            raise forms.ValidationError("This email is already in use.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password and password != confirm_password:
            self.add_error('confirm_password', "Passwords do not match.")
        return cleaned_data

    def __init__(self, *args, **kwargs):
        self.instance = kwargs.get('instance')
        super().__init__(*args, **kwargs)
        # super().__init__(*args, **kwargs)
        # self.helper = FormHelper()
        # self.helper.form_method = 'post'
        # self.helper.add_input(
        #     Submit('submit', 'Save', css_class='btn btn-primary'))


class UnitForm(forms.ModelForm):
    class Meta:
        model = Unit
        fields = ['unit_name', 'unit_short_name', 'unit_type',]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.add_input(
            Submit('submit', 'Save', css_class='btn btn-primary'))


class DepartmentForm(forms.ModelForm):
    class Meta:
        model = Department
        fields = ['department_name', 'department_short_name', 'unit_id']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.add_input(
            Submit('submit', 'Save', css_class='btn btn-primary'))


class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ['question_id', 'question_question', 'question_type']
        labels = {
            'question_id': 'Question ID',
        }
        widgets = {
            'question_id': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter question ID.'}),
            'question_question': forms.Textarea(attrs={'class': 'form-control', 'placeholder': 'Enter question', 'rows': 3}),
            'question_type': forms.Select(attrs={'class': 'form-control', }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.add_input(
            Submit('submit', 'Save', css_class='btn btn-primary'))


# Wizard
class Page1Form(forms.ModelForm):
    class Meta:
        model = Transactional
        fields = ['region', 'client_type', 'client_age', 'sex', 'client_name',
                  't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 'others']
        labels = {

        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['others'].widget.attrs['disabled'] = True


class Page2Form(forms.ModelForm):
    class Meta:
        model = Transactional
        fields = ['cc11', 'cc12', 'cc13', 'cc14', 'cc21', 'cc22',
                  'cc23', 'cc24', 'cc25', 'cc31', 'cc32', 'cc33', 'cc34']


class Page3Form(forms.Form):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        questions = Question.objects.all()
        for question in questions:
            self.fields[f'{question.question_id}. {question.question_question}'] = forms.ChoiceField(
                choices=[
                    (1, '😠 '),
                    (2, '😟 '),
                    (3, '😐 '),
                    (4, '😊 '),
                    (5, '😍 '),
                    (0, 'N/A')
                ],
                widget=forms.RadioSelect
            )


class Page4Form(forms.ModelForm):
    class Meta:
        model = Transactional
        fields = ['comment']


class Page5Form(forms.ModelForm):
    class Meta:
        model = Transactional
        # Customize as needed for summary
        exclude = ['transaction_id', 'user_id', 'created_on']


# client survey
class ClientSurveyForm(forms.ModelForm):
    # SQD_CHOICES = [
    #     (1, '😠'),  # Strongly Disagree
    #     (2, '😟'),  # Disagree
    #     (3, '😐'),  # Neither Agree nor Disagree
    #     (4, '😊'),  # Agree
    #     (5, '😍'),  # Strongly Agree
    #     (0, 'N/A'),  # Not Applicable
    # ]
    SQD_CHOICES = [
        (1, 'Strongly Disagree'),
        (2, 'Disagree'),
        (3, 'Neutral'),
        (4, 'Agree'),
        (5, 'Strongly Agree'),
        (0, 'N/A'),  # Not Applicable
    ]

    sqd0 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd1 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd2 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd3 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd4 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd5 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd6 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd7 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    sqd8 = forms.ChoiceField(
        choices=SQD_CHOICES, widget=forms.RadioSelect)
    # Add other fields as needed

    transaction_types = forms.MultipleChoiceField(
        choices=[
            ('Application/Request of Documents',
             'Application/Request of Documents'),
            ('Bills/Fees Payment', 'Bills/Fees Payment'),
            ('Inquiry on Services', 'Inquiry on Services'),
            ('Submission of Documents', 'Submission of Documents'),
            ('Delivery of Supplies', 'Delivery of Supplies'),
            ('Filing of Complaints', 'Filing of Complaints'),
            ('Follow-up on Request/Complaint', 'Follow-up on Request/Complaint'),
            ('Research Concerns', 'Research Concerns (e.g., data gathering, interview)'),
            ('Other', 'Other (Please specify below)')
        ],
        widget=forms.CheckboxSelectMultiple
    )

    CC1_CHOICES = [
        ('1', "I know what a CC is and I saw this office’s CC."),
        ('2', "I know what a CC is but I did NOT see this office’s CC."),
        ('3', "I know what a CC is but I did NOT see this office’s CC."),
        ('4', "I do not know what a CC and I did NOT see one in this office."),
    ]

    CC2_CHOICES = [
        ('1', "Easy to see"),
        ('2', "Somewhat easy to see"),
        ('3', "Difficult to see"),
        ('4', "Not visible at all"),
        ('5', "N/A"),
    ]

    CC3_CHOICES = [
        ('1', "Helped very much"),
        ('2', "Somewhat helped"),
        ('3', "Did not help"),
        ('4', "N/A"),
    ]

    cc1 = forms.ChoiceField(
        choices=CC1_CHOICES,
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'})
    )
    cc2 = forms.ChoiceField(
        choices=CC2_CHOICES,
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'})
    )
    cc3 = forms.ChoiceField(
        choices=CC3_CHOICES,
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'})
    )

    class Meta:
        model = ClientSurvey
        fields = [
            'user_id', 'client_type', 'region', 'sex', 'age', 'transaction_types',
            'cc1', 'cc2', 'cc3', 'sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5',
            'sqd6', 'sqd7', 'sqd8', 'suggestions', 'email', 'others'
        ]
        widgets = {
            'region': forms.Select(attrs={'class': 'form-control'}),
            'sex': forms.Select(attrs={'class': 'form-control'}),
            'age': forms.NumberInput(attrs={'class': 'form-control'}),
            'suggestions': forms.Textarea(attrs={'class': 'form-control', 'placeholder': 'Comments/Suggestions', 'rows': 4}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email address (optional)'}),
            'others': forms.Textarea(attrs={'rows': 3, 'class': 'form-control', 'placeholder': 'Specify here..'})
        }

# Rating form


class RatingForm(forms.ModelForm):
    class Meta:
        model = Rating
        fields = ['rating', 'comments']
        widgets = {
            # Hide labels for the radio buttons
            'rating': forms.RadioSelect(choices=[(i, '') for i in range(1, 6)]),
            'comments': forms.Textarea(attrs={'rows': 4, 'class': 'form-control', 'placeholder': 'Leave your comments here...'}),
        }


# Dashboard

class YearSelectionForm(forms.Form):
    year = forms.ChoiceField(
        choices=[(year, year)
                 for year in ClientSurvey.objects.dates('created_on', 'year')],
        required=True,
        label="Select Year",
    )


# Login Form
class CustomAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(
        label="Email", widget=forms.EmailInput(attrs={'class': 'form-control'}))
    password = forms.CharField(
        label="Password", widget=forms.PasswordInput(attrs={'class': 'form-control'}))

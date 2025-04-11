from django.forms.widgets import CheckboxSelectMultiple


class CustomCheckboxSelectMultiple(CheckboxSelectMultiple):
    template_name = 'widgets/custom_checkbox_select_multiple.html'

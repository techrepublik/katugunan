# tables.py
import django_tables2 as tables
from .models import Unit, Department


class UnitTable(tables.Table):
    class Meta:
        model = Unit
        template_name = 'django_tables2/bootstrap4.html'
        fields = ('unit_name', 'unit_short_name')


class DepartmentTable(tables.Table):
    class Meta:
        model = Department
        template_name = 'django_tables2/bootstrap4.html'
        fields = ('department_name', 'department_short_name', 'unit_id')

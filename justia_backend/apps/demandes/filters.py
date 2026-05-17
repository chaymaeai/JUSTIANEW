import django_filters

from .models import Demande


class DemandeFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    domain = django_filters.CharFilter()
    urgency = django_filters.CharFilter()
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Demande
        fields = ("status", "domain", "urgency", "date_from", "date_to")

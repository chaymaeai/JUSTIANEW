import django_filters

from .models import Document


class DocumentFilter(django_filters.FilterSet):
    file_type = django_filters.CharFilter()
    demande_id = django_filters.UUIDFilter(field_name="demande_id")
    date_from = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Document
        fields = ("file_type", "demande_id", "date_from", "date_to")

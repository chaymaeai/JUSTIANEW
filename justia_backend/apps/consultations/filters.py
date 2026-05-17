import django_filters

from .models import Consultation


class ConsultationFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    expert_id = django_filters.UUIDFilter(field_name="expert_id")
    demande_id = django_filters.UUIDFilter(field_name="demande_id")
    date_from = django_filters.DateTimeFilter(field_name="scheduled_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="scheduled_at", lookup_expr="lte")

    class Meta:
        model = Consultation
        fields = ("status", "expert_id", "demande_id", "date_from", "date_to")

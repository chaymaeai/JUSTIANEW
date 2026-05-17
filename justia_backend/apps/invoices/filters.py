import django_filters

from .models import Invoice


class InvoiceFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    client_id = django_filters.UUIDFilter(field_name="client_id")
    date_from = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    date_to = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    currency = django_filters.CharFilter()

    class Meta:
        model = Invoice
        fields = ("status", "client_id", "date_from", "date_to", "currency")

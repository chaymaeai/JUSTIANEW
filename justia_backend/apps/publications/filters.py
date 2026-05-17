import django_filters
from .models import Publication

class PublicationFilter(django_filters.FilterSet):
    type        = django_filters.CharFilter(field_name='pub_type')
    category    = django_filters.CharFilter(field_name='category__slug')
    tag         = django_filters.CharFilter(field_name='tags__slug')
    language    = django_filters.CharFilter(field_name='language')
    featured    = django_filters.BooleanFilter(field_name='is_featured')
    access      = django_filters.CharFilter(field_name='access')
    date_from   = django_filters.DateFilter(field_name='published_at', lookup_expr='gte')
    date_to     = django_filters.DateFilter(field_name='published_at', lookup_expr='lte')
    status      = django_filters.CharFilter(field_name='status')

    class Meta:
        model = Publication
        fields = ["type", "category", "tag", "language", "featured", "status", "access", "date_from", "date_to"]
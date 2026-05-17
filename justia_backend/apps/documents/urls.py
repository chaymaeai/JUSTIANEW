from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentStatsView, DocumentViewSet

router = DefaultRouter()
router.register("", DocumentViewSet, basename="document")

urlpatterns = [
    path("stats/", DocumentStatsView.as_view(), name="document-stats"),
    path("", include(router.urls)),
]

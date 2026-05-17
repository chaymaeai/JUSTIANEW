from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ConsultationViewSet, ExpertAvailabilityView, PublicConsultationRequestView

router = DefaultRouter()
router.register("", ConsultationViewSet, basename="consultation")

urlpatterns = [
    path("public-request/", PublicConsultationRequestView.as_view()),
    path("availability/", ExpertAvailabilityView.as_view()),
    path("", include(router.urls)),
]
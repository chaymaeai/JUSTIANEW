from django.urls import path
from .views import RapportGenerateView

urlpatterns = [
    path("generate/", RapportGenerateView.as_view(), name="rapport-generate"),
]
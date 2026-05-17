# experts/urls.py
from django.urls import path
from apps.consultations.views import ExpertAvailabilityView
from .views import (
    AdminCreateExpertView,
    ExpertDirectoryListView,
    ExpertProfileMeView,
    AdminExpertDetailView,
    AdminExpertListView,
)

urlpatterns = [
    path("admin/create/", AdminCreateExpertView.as_view(), name="expert-admin-create"),
    path("admin/list/", AdminExpertListView.as_view(), name="expert-admin-list"),
    path("me/availability/", ExpertAvailabilityView.as_view(), name="expert-availability"),
    path("me/profile/", ExpertProfileMeView.as_view(), name="expert-profile-me"),
    path("<int:pk>/", AdminExpertDetailView.as_view(), name="expert-admin-detail"),
    path("", ExpertDirectoryListView.as_view(), name="expert-directory"),
]

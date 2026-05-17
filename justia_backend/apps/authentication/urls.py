from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    ConfirmPasswordResetView,
    CreateExpertView,
    ExpertListView,
    LoginView,
    LogoutView,
    MeView,
    NotificationPreferencesView,
    RegisterView,
    RequestPasswordResetView,
    StaffClientDetailView,
    StaffClientListView,
    StaffLoginView,
    VerifyEmailView,
)

urlpatterns = [
    # ── Client ──────────────────────────────────────────────
    path("register/",               RegisterView.as_view()),
    path("login/",                  LoginView.as_view()),
    path("logout/",                 LogoutView.as_view()),
    path("token/refresh/",          TokenRefreshView.as_view()),
    path("me/",                     MeView.as_view()),
    path("change-password/",        ChangePasswordView.as_view()),
    path("reset-password/request/", RequestPasswordResetView.as_view()),
    path("reset-password/confirm/", ConfirmPasswordResetView.as_view()),
    path("notifications/",          NotificationPreferencesView.as_view()),
    path("verify-email/<uuid:token>/", VerifyEmailView.as_view()),

    # ── Staff (expert + admin) ───────────────────────────────
    path("staff/login/",            StaffLoginView.as_view()),
    path("staff/clients/",          StaffClientListView.as_view()),
    path("staff/clients/<uuid:pk>/",StaffClientDetailView.as_view()),

    # ── Admin uniquement ─────────────────────────────────────
    path("staff/experts/",          ExpertListView.as_view()),
    path("staff/experts/create/",   CreateExpertView.as_view()),
]
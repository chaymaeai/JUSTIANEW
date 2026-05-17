"""
apps/demandes/urls.py  — version complète
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DemandeStatsView, DemandeViewSet
from .views_lifecycle import DossierLifecycleView, DossierTransitionView

router = DefaultRouter()
router.register("", DemandeViewSet, basename="demande")

urlpatterns = [
    # ── Stats ─────────────────────────────────────────────────
    path("stats/", DemandeStatsView.as_view(), name="demande-stats"),

    # ── State Machine ─────────────────────────────────────────
    # POST { "status": "en_cours" }
    path("<uuid:pk>/transition/", DossierTransitionView.as_view(), name="demande-transition"),
    # GET  état + transitions disponibles + timeline + historique
    path("<uuid:pk>/lifecycle/",  DossierLifecycleView.as_view(),  name="demande-lifecycle"),

    # ── ViewSet (en dernier — capte tout le reste) ────────────
    path("", include(router.urls)),
]
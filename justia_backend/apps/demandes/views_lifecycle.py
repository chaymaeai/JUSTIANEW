"""
apps/demandes/views_lifecycle.py
═══════════════════════════════════════════════════════════════
Deux endpoints State Machine à ajouter dans urls.py :

    POST /api/demandes/{id}/transition/
    GET  /api/demandes/{id}/lifecycle/
═══════════════════════════════════════════════════════════════
"""
import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Demande
from .state_machine import (
    DS, FinalStateError, InvalidTransitionError,
    TransitionPermissionError, state_machine,
)

logger = logging.getLogger(__name__)


def _safe_notify(demande):
    try:
        from .tasks import notify_client_demande_status_changed
        notify_client_demande_status_changed.delay(str(demande.id))
    except Exception:
        logger.debug("Notification skipped (Celery unavailable)")


class DossierTransitionView(APIView):
    """
    POST /api/demandes/{id}/transition/
    Body : { "status": "en_cours" }

    Effectue une transition validée par le State Machine.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["demandes"])
    def post(self, request, pk):
        # ── Récupérer le dossier ────────────────────────────
        try:
            demande = Demande.objects.get(pk=pk)
        except Demande.DoesNotExist:
            return Response({"detail": "Dossier introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        role = getattr(user, "role", "")

        # ── Contrôle d'accès au dossier ─────────────────────
        if role == "client" and demande.client_id != user.id:
            return Response({"detail": "Accès non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        if role == "expert" and demande.assigned_to_id != user.id:
            return Response({"detail": "Ce dossier ne vous est pas assigné."}, status=status.HTTP_403_FORBIDDEN)

        # ── Lire le statut cible ────────────────────────────
        new_status = request.data.get("status", "").strip().lower()
        if not new_status:
            return Response(
                {
                    "detail": "Le champ 'status' est requis.",
                    "available": state_machine.available_for_role(demande.status, role),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Exécuter via State Machine ──────────────────────
        try:
            result = state_machine.transition(demande, new_status, user)
        except FinalStateError as e:
            return Response(
                {"detail": str(e), "code": "final_state", "current_status": demande.status},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except InvalidTransitionError as e:
            return Response(
                {
                    "detail": str(e),
                    "code": "invalid_transition",
                    "current_status": e.from_status,
                    "requested_status": e.to_status,
                    "available": state_machine.available(e.from_status),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except TransitionPermissionError as e:
            return Response(
                {"detail": str(e), "code": "permission_denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

        _safe_notify(demande)

        return Response({
            **result,
            "dossier": {
                "id":           str(demande.id),
                "reference":    demande.reference,
                "status":       demande.status,
                "status_label": DS.LABELS.get(demande.status, demande.status),
            },
        })


class DossierLifecycleView(APIView):
    """
    GET /api/demandes/{id}/lifecycle/
    Retourne état actuel + transitions disponibles + timeline + historique.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["demandes"])
    def get(self, request, pk):
        try:
            demande = Demande.objects.prefetch_related("activities__user").get(pk=pk)
        except Demande.DoesNotExist:
            return Response({"detail": "Dossier introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        role = getattr(user, "role", "")

        available = state_machine.available_for_role(demande.status, role)

        # Historique des changements de statut
        history = []
        for a in demande.activities.filter(action="status_changed").order_by("created_at"):
            history.append({
                "from_status": a.old_value,
                "from_label":  DS.LABELS.get(a.old_value, a.old_value),
                "to_status":   a.new_value,
                "to_label":    DS.LABELS.get(a.new_value, a.new_value),
                "comment":     a.comment,
                "created_at":  a.created_at.isoformat(),
            })

        # Timeline (hors annulée)
        current_idx = DS.TIMELINE.index(demande.status) if demande.status in DS.TIMELINE else -1
        timeline = [
            {
                "status":    s,
                "label":     DS.LABELS.get(s, s),
                "color":     DS.COLORS.get(s, "slate"),
                "completed": i <= current_idx,
                "current":   s == demande.status,
            }
            for i, s in enumerate(DS.TIMELINE)
        ]

        return Response({
            "dossier_id":   str(demande.id),
            "reference":    demande.reference,
            "current_status": {
                "value": demande.status,
                "label": DS.LABELS.get(demande.status, demande.status),
                "color": DS.COLORS.get(demande.status, "slate"),
            },
            "available_transitions": [
                {"value": t, "label": DS.LABELS.get(t, t), "color": DS.COLORS.get(t, "slate")}
                for t in available
            ],
            "is_final":  demande.status in DS.FINAL,
            "is_cancelled": demande.status == DS.ANNULEE,
            "timeline":  timeline,
            "history":   history,
        })
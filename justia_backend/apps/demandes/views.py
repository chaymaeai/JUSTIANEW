import statistics

from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.permissions import IsClient, IsExpertOrAdmin  # ✅ renomme
from apps.core.permissions import IsClient, IsFournisseurOrAdmin

from .filters import DemandeFilter
from .models import Demande, DemandeActivity
from .serializers import (
    DemandeActivitySerializer,
    DemandeAssignSerializer,
    DemandeCreateSerializer,
    DemandeDetailSerializer,
    DemandeListSerializer,
    DemandeMessageSerializer,
    DemandeUpdateSerializer,
)


def _fournisseur_may_modify(user, demande) -> bool:
    if getattr(user, "role", None) == "admin":
        return True
    if getattr(user, "role", None) == "expert":
        return demande.assigned_to_id == user.id
    return False


class DemandeViewSet(viewsets.ModelViewSet):
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_class = DemandeFilter
    search_fields = ("reference", "description")
    ordering_fields = ("created_at", "urgency", "status", "reference")
    ordering = ("-created_at",)

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Demande.objects.all()
            .select_related("client", "assigned_to")
            .prefetch_related(
                "activities__user",
                "messages__sender",
                "documents",
                "consultations",
            )
        )
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "client":
            return qs.filter(client=user)
        if role == "expert":
            return qs.filter(Q(assigned_to=user) | Q(assigned_to__isnull=True))
        if role == "admin":
            return qs
        return Demande.objects.none()

    def get_permissions(self):
        if self.action == "create":
            return [IsClient()]
        if self.action in ("update", "partial_update"):
            return [IsFournisseurOrAdmin()]
        if self.action == "assign":
            return [IsFournisseurOrAdmin()]
        if self.action == "cancel":
            return [IsClient()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return DemandeListSerializer
        if self.action == "create":
            return DemandeCreateSerializer
        if self.action in ("update", "partial_update"):
            return DemandeUpdateSerializer
        return DemandeDetailSerializer

    def update(self, request, *args, **kwargs):
        demande = self.get_object()
        if not _fournisseur_may_modify(request.user, demande):
            raise PermissionDenied()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        demande = self.get_object()
        if not _fournisseur_may_modify(request.user, demande):
            raise PermissionDenied()
        kwargs["partial"] = True
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(tags=["demandes"])
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsFournisseurOrAdmin],
        url_path="assign",
    )
    def assign(self, request, pk=None):
        demande = self.get_object()
        if not _fournisseur_may_modify(request.user, demande):
            raise PermissionDenied()
        ser = DemandeAssignSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save(demande=demande)
        demande.refresh_from_db()
        return Response(
            DemandeDetailSerializer(demande, context={"request": request}).data
        )

    @extend_schema(tags=["demandes"])
    @action(detail=True, methods=["post"], permission_classes=[IsClient])
    def cancel(self, request, pk=None):
        demande = self.get_object()
        if demande.client_id != request.user.id:
            raise PermissionDenied()
        if demande.status != "en_attente":
            return Response(
                {"detail": "Seules les demandes « en attente » peuvent être annulées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        demande.status = "annulee"
        demande.save(update_fields=["status"])
        DemandeActivity.objects.create(
            demande=demande,
            user=request.user,
            action="status_changed",
            old_value="en_attente",
            new_value="annulee",
            comment="Annulée par le client",
        )
        return Response(
            DemandeDetailSerializer(demande, context={"request": request}).data
        )

    @extend_schema(tags=["demandes"])
    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        demande = self.get_object()
        if getattr(request.user, "role", None) == "fournisseur" and not _fournisseur_may_modify(
            request.user, demande
        ):
            raise PermissionDenied()

        if request.method == "GET":
            qs = demande.messages.select_related("sender").order_by("created_at")
            ser = DemandeMessageSerializer(
                qs, many=True, context={"request": request}
            )
            return Response(ser.data)

        ser = DemandeMessageSerializer(
            data=request.data,
            context={"request": request, "demande": demande},
        )
        ser.is_valid(raise_exception=True)
        ser.save()

        # ✅ Notifier le destinataire
        try:
            from apps.notifications.services import notify
            sender = request.user
            role = getattr(sender, "role", None)

            if role in ("expert", "fournisseur", "admin") and demande.client_id:
                notify(
                    recipient_id=demande.client_id,
                    notif_type="nouveau_message",
                    title="Nouveau message de votre expert",
                    message=f"Vous avez reçu un message concernant votre dossier {demande.reference}.",
                    link=f"/client-space/demandes/{demande.id}",
                    demande_id=demande.id,
                )
            elif role == "client" and demande.assigned_to_id:
                notify(
                    recipient_id=demande.assigned_to_id,
                    notif_type="nouveau_message",
                    title="Nouveau message du client",
                    message=f"Le client a envoyé un message sur le dossier {demande.reference}.",
                    link=f"/fournisseur/demandes/{demande.id}",
                    demande_id=demande.id,
                )
        except Exception:
            pass

        return Response(
            DemandeMessageSerializer(
                ser.instance, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(tags=["demandes"])
    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        demande = self.get_object()
        if getattr(request.user, "role", None) == "fournisseur" and not _fournisseur_may_modify(
            request.user, demande
        ):
            raise PermissionDenied()
        qs = demande.activities.select_related("user").order_by("-created_at")
        ser = DemandeActivitySerializer(qs, many=True)
        return Response(ser.data)


@extend_schema(tags=["demandes"])
class DemandeStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def _base_qs(self, request):
        qs = Demande.objects.all()
        role = getattr(request.user, "role", None)
        if role == "client":
            return qs.filter(client=request.user)
        if role in ("expert", "fournisseur"):              # ← FIX
            return qs.filter(
                Q(assigned_to=request.user) | Q(assigned_to__isnull=True)
            )
        if role == "admin":
            return qs
        return Demande.objects.none()

    def get(self, request):
        qs = self._base_qs(request)
        now = timezone.now()
        start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        treated = qs.filter(status="traitee", treated_at__isnull=False)
        days = []
        for d in treated.iterator():
            if d.treated_at and d.created_at:
                days.append((d.treated_at - d.created_at).total_seconds() / 86400.0)
        avg_days = float(statistics.mean(days)) if days else 0.0

        by_domain = list(
            qs.values("domain")
            .annotate(count=Count("id"))
            .order_by("domain")
        )
        by_urgency = list(
            qs.values("urgency")
            .annotate(count=Count("id"))
            .order_by("urgency")
        )

        return Response(
            {
                "total": qs.count(),
                "en_attente": qs.filter(status="en_attente").count(),
                "en_cours": qs.filter(status="en_cours").count(),
                "traitee": qs.filter(status="traitee").count(),
                "annulee": qs.filter(status="annulee").count(),
                "by_domain": by_domain,
                "by_urgency": by_urgency,
                "avg_treatment_days": avg_days,
                "this_month_count": qs.filter(created_at__gte=start_month).count(),
            }
        )
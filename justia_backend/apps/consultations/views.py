import datetime as dt
from django.contrib.auth import get_user_model

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from apps.demandes.models import Demande, DemandeActivity
from apps.core.permissions import IsClient, IsFournisseur, IsFournisseurOrAdmin
from django.utils import timezone
from .filters import ConsultationFilter
from .models import Consultation, ExpertAvailability
from .serializers import (
    ConsultationCancelSerializer,
    ConsultationCreateSerializer,
    ConsultationDetailSerializer,
    ConsultationListSerializer,
    ConsultationRateSerializer,
    ConsultationReportSerializer,
    ConsultationRescheduleSerializer,
    ExpertAvailabilitySerializer,
)
from .services import generate_available_slots


def _can_cancel(user, c: Consultation) -> bool:
    role = getattr(user, "role", None)
    if role == "admin":
        return True
    if role == "client" and c.client_id == user.id:
        return True
    if role == "expert" and c.expert_id == user.id:
        return True
    return False


def _expert_may_manage(user, c: Consultation) -> bool:
    if getattr(user, "role", None) == "admin":
        return True
    if getattr(user, "role", None) == "expert" and c.expert_id == user.id:
        return True
    return False


class ConsultationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = ConsultationFilter
    ordering_fields = ("scheduled_at", "created_at", "status")
    ordering = ("-scheduled_at",)

    def get_queryset(self):
        qs = Consultation.objects.select_related(
            "demande", "client", "expert", "cancelled_by"
        )
        Consultation.objects.filter(
        status="planifiee",
        scheduled_at__lt=timezone.now()
    ).update(status="terminee")
    
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "client":
            return qs.filter(client=user)
        if role == "expert":
            return qs.filter(expert=user)
        if role == "admin":
            return qs
        return Consultation.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return ConsultationListSerializer
        if self.action == "create":
            return ConsultationCreateSerializer
        return ConsultationDetailSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsFournisseurOrAdmin()]
        return [IsAuthenticated()]

    @extend_schema(tags=["consultations"])
    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        c = self.get_object()
        if not _can_cancel(request.user, c):
            raise PermissionDenied()
        ser = ConsultationCancelSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        c.status = "annulee"
        c.cancel_reason = ser.validated_data["cancel_reason"]
        c.cancelled_by = request.user
        c.cancelled_at = timezone.now()
        c.save()
        from .tasks import notify_consultation_cancelled
        notify_consultation_cancelled(str(c.id))
        return Response(ConsultationDetailSerializer(c, context={"request": request}).data)

    @extend_schema(tags=["consultations"])
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsFournisseurOrAdmin],
        url_path="reschedule",
    )
    def reschedule(self, request, pk=None):
        c = self.get_object()
        if not _expert_may_manage(request.user, c):
            raise PermissionDenied()
        ser = ConsultationRescheduleSerializer(
            data=request.data, context={"consultation": c, "request": request}
        )
        ser.is_valid(raise_exception=True)
        new_t = ser.validated_data["new_scheduled_at"]
        c.scheduled_at = new_t
        c.status = "planifiee"
        c.save()
        from .tasks import notify_consultation_rescheduled, schedule_consultation_reminder
        notify_consultation_rescheduled(str(c.id))
        schedule_consultation_reminder(str(c.id), c.scheduled_at.isoformat())
        return Response(ConsultationDetailSerializer(c, context={"request": request}).data)

    @extend_schema(tags=["consultations"])
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsFournisseurOrAdmin],
        url_path="report",
    )
    def add_report(self, request, pk=None):
        c = self.get_object()
        role = getattr(request.user, "role", None)
        if role != "admin" and c.expert_id != request.user.id:
            raise PermissionDenied()
        ser = ConsultationReportSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        c.notes = ser.validated_data.get("notes", c.notes)
        c.report = ser.validated_data.get("report", c.report)
        c.status = "terminee"
        c.ended_at = timezone.now()
        c.save()
        from .tasks import notify_consultation_report_ready
        notify_consultation_report_ready(str(c.id))
        return Response(ConsultationDetailSerializer(c, context={"request": request}).data)

    @extend_schema(tags=["consultations"])
    @action(detail=True, methods=["post"], permission_classes=[IsClient], url_path="rate")
    def rate(self, request, pk=None):
        c = self.get_object()
        if c.client_id != request.user.id:
            raise PermissionDenied()
      
        if c.status != "terminee" and c.scheduled_at > timezone.now():
         raise ValidationError({"detail": "La consultation doit être terminée."})
        if c.rating is not None:
            raise ValidationError({"detail": "Une note a déjà été enregistrée."})
        ser = ConsultationRateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        c.rating = ser.validated_data["rating"]
        c.rating_comment = ser.validated_data.get("rating_comment", "")
        c.save()
        if getattr(c.expert, "role", None) == "expert":
            from apps.experts.models import ExpertProfile
            profile, _ = ExpertProfile.objects.get_or_create(user=c.expert)
            profile.update_rating()
        return Response(ConsultationDetailSerializer(c, context={"request": request}).data)

    # ✅ NOUVEAU — statistiques de satisfaction
    @extend_schema(tags=["consultations"])
    @action(detail=False, methods=["get"], url_path="rating-stats")
    def rating_stats(self, request):
        from django.db.models import Avg, Count
        qs = self.get_queryset().filter(rating__isnull=False)
        agg = qs.aggregate(avg=Avg("rating"), total=Count("id"))
        breakdown = {
            star: qs.filter(rating=star).count()
            for star in range(1, 6)
        }
        return Response({
            "average":   round(float(agg["avg"] or 0), 1),
            "total":     agg["total"],
            "breakdown": breakdown,  # { 1: x, 2: x, 3: x, 4: x, 5: x }
        })

    @extend_schema(tags=["consultations"])
    @action(detail=False, methods=["get"], url_path="available-slots")
    def available_slots(self, request):
        expert_id = request.query_params.get("expert_id")
        date_from_s = request.query_params.get("date_from")
        date_to_s = request.query_params.get("date_to")
        duration_s = request.query_params.get("duration", "45")
        if not expert_id or not date_from_s or not date_to_s:
            return Response(
                {"detail": "expert_id, date_from et date_to sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            duration = int(duration_s)
        except ValueError:
            duration = 45
        try:
            date_from = dt.date.fromisoformat(date_from_s)
            date_to = dt.date.fromisoformat(date_to_s)
        except ValueError:
            return Response(
                {"detail": "date_from / date_to au format YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slots = generate_available_slots(expert_id, date_from, date_to, duration)
        return Response({"duration": duration, "slots": slots})

    @extend_schema(tags=["consultations"])
    @action(detail=False, methods=["get"], url_path="calendar")
    def calendar(self, request):
        month = request.query_params.get("month")
        expert_id = request.query_params.get("expert_id")
        if not month or not expert_id:
            return Response(
                {"detail": "month (YYYY-MM) et expert_id sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            y, m = month.split("-")
            year, month_num = int(y), int(m)
        except (ValueError, AttributeError):
            return Response(
                {"detail": "month doit être au format YYYY-MM."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = Consultation.objects.filter(
            expert_id=expert_id,
            scheduled_at__year=year,
            scheduled_at__month=month_num,
        ).select_related("client", "expert")
        events = []
        for c in qs:
            end_ev = c.scheduled_at + dt.timedelta(minutes=c.duration)
            events.append({
                "id": str(c.id),
                "title": f"{c.get_consultation_type_display()} — {c.client.full_name if c.client else ''}",
                "start": c.scheduled_at.isoformat(),
                "end": end_ev.isoformat(),
                "status": c.status,
                "client_name": c.client.full_name if c.client else "",
                "type": c.consultation_type,
            })
        return Response({"month": month, "expert_id": expert_id, "events": events})


class ExpertAvailabilityView(APIView):
    permission_classes = [IsAuthenticated, IsFournisseur]

    def get(self, request):
        rows = ExpertAvailability.objects.filter(expert=request.user).order_by(
            "weekday", "start_time"
        )
        ser = ExpertAvailabilitySerializer(rows, many=True)
        return Response({"slots": ser.data})

    def put(self, request):
        ExpertAvailability.objects.filter(expert=request.user).delete()
        data = request.data
        if isinstance(data, dict) and "slots" in data:
            data = data["slots"]
        if not isinstance(data, list):
            return Response(
                {"detail": "Corps attendu : liste de créneaux ou { \"slots\": [...] }."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = []
        for row in data:
            ser = ExpertAvailabilitySerializer(data=row)
            ser.is_valid(raise_exception=True)
            obj = ExpertAvailability.objects.create(
                expert=request.user, **ser.validated_data
            )
            created.append(obj)
        out = ExpertAvailabilitySerializer(created, many=True)
        return Response({"slots": out.data})


from rest_framework.permissions import AllowAny

class PublicConsultationRequestView(APIView):
    """
    POST /api/consultations/public-request/
    Formulaire public — crée une demande sans authentification.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        required = ["domain", "description", "scheduled_at",
                    "contact_first_name", "contact_last_name", "contact_email"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response(
                {"detail": f"Champs requis manquants: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = data["contact_email"]
        User = get_user_model()

        try:
            client = User.objects.get(email=email, role="client")
        except User.DoesNotExist:
            import secrets
            client = User.objects.create_user(
                email=email,
                password=secrets.token_urlsafe(16),
                first_name=data["contact_first_name"],
                last_name=data["contact_last_name"],
                role="client",
                phone=data.get("contact_phone", ""),
                is_active=True,
            )

        domain_map = {
            "Droit des affaires": "droit_affaires",
            "RGPD / Cybersécurité": "rgpd",
            "Droit de l'IA": "droit_ia",
            "Propriété intellectuelle": "propriete_intellectuelle",
            "Droit du numérique": "droit_numerique",
            "Contrats & contentieux": "droit_affaires",
        }
        domain = domain_map.get(data["domain"], "droit_affaires")
        urgency = "urgente" if data.get("urgency") == "priority" else "normale"

        demande = Demande.objects.create(
            client=client,
            domain=domain,
            description=data["description"],
            urgency=urgency,
            status="en_attente",
            internal_notes=f"Créneau souhaité: {data.get('scheduled_at')} | "
                          f"Tél: {data.get('contact_phone', '')} | "
                          f"Entreprise: {data.get('notes', '')}",
        )
        DemandeActivity.objects.create(
            demande=demande,
            user=client,
            action="created",
            new_value=demande.reference,
            comment="Demande créée via formulaire public de consultation",
        )

        try:
            from django.core.mail import send_mail
            from django.conf import settings
            send_mail(
                subject="✅ Votre demande de consultation JUSTIA",
                message=f"Bonjour {client.first_name},\n\n"
                        f"Votre demande de consultation a bien été reçue.\n"
                        f"Référence: {demande.reference}\n"
                        f"Créneau souhaité: {data.get('scheduled_at')}\n\n"
                        f"Notre équipe vous contactera sous 2h.\n\nJUSTIA",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "reference": demande.reference,
            "message": "Votre demande a été enregistrée. Vous recevrez une confirmation par email."
        }, status=status.HTTP_201_CREATED)
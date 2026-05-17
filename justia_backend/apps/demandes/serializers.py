import logging

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.authentication.serializers import UserSerializer
from apps.consultations.serializers import ConsultationListSerializer
from apps.documents.serializers import DocumentSerializer

from .models import Demande, DemandeActivity, DemandeMessage

User = get_user_model()
logger = logging.getLogger(__name__)


def _safe_delay(task, *args):
    try:
        task(*args)
    except Exception:
        logger.exception("Async task dispatch failed", extra={"task": getattr(task, "name", str(task))})


class DemandeActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandeActivity
        fields = (
            "id",
            "user",
            "action",
            "old_value",
            "new_value",
            "comment",
            "created_at",
        )
        read_only_fields = fields


class DemandeMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = DemandeMessage
        fields = ("id", "sender", "sender_name", "content", "is_read", "created_at")
        read_only_fields = ("id", "sender", "is_read", "created_at")

    def get_sender_name(self, obj):
        return obj.sender.full_name if obj.sender else ""

    def create(self, validated_data):
        demande = self.context["demande"]
        request = self.context["request"]
        msg = DemandeMessage.objects.create(
            demande=demande,
            sender=request.user,
            content=validated_data["content"],
        )
        DemandeMessage.objects.filter(demande=demande).exclude(
            sender=request.user
        ).update(is_read=True)
        from .tasks import notify_demande_message_recipient

        _safe_delay(notify_demande_message_recipient, str(msg.id))
        return msg


class DemandeListSerializer(serializers.ModelSerializer):
    domain_display = serializers.CharField(source="get_domain_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    client_phone = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    consultations_count = serializers.SerializerMethodField()

    class Meta:
        model = Demande
        fields = (
            "id",
            "reference",
            "domain",
            "domain_display",
            "description",
            "urgency",
            "status",
            "status_display",
            "created_at",
            "updated_at",
            "client_name",
            "client_email",
            "client_phone",
            "assigned_to_name",
            "documents_count",
            "consultations_count",
        )

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.full_name
        return ""

    def get_client_email(self, obj):
        if obj.client:
            return obj.client.email
        return ""

    def get_client_phone(self, obj):
        if obj.client:
            return obj.client.phone or ""
        return ""

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None

    def get_documents_count(self, obj):
        return obj.documents.count()

    def get_consultations_count(self, obj):
        return obj.consultations.count()


class DemandeDetailSerializer(serializers.ModelSerializer):
    domain_display = serializers.CharField(source="get_domain_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    urgency_display = serializers.CharField(source="get_urgency_display", read_only=True)
    client = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    activities = DemandeActivitySerializer(many=True, read_only=True)
    messages = DemandeMessageSerializer(many=True, read_only=True)
    documents = serializers.SerializerMethodField()
    consultations = ConsultationListSerializer(many=True, read_only=True)

    class Meta:
        model = Demande
        fields = (
            "id",
            "reference",
            "client",
            "assigned_to",
            "domain",
            "domain_display",
            "description",
            "urgency",
            "urgency_display",
            "status",
            "status_display",
            "internal_notes",
            "conclusion",
            "assigned_at",
            "treated_at",
            "created_at",
            "updated_at",
            "activities",
            "messages",
            "documents",
            "consultations",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and getattr(request.user, "role", None) == "client":
            data.pop("internal_notes", None)
        return data

    def get_documents(self, obj):
        qs = obj.documents.all()
        request = self.context.get("request")
        if request and getattr(request.user, "role", None) == "client":
            qs = qs.filter(is_private=False)
        return DocumentSerializer(qs, many=True, context=self.context).data


class DemandeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Demande
        fields = (
            "id",
            "reference",
            "domain",
            "description",
            "urgency",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "reference", "status", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context["request"]
        demande = Demande.objects.create(client=request.user, **validated_data)
        DemandeActivity.objects.create(
            demande=demande,
            user=request.user,
            action="created",
            new_value=demande.reference,
            comment="Demande créée",
        )
        from .tasks import (
            notify_fournisseur_team_new_demande,
            send_demande_confirmation_email,
        )

        _safe_delay(send_demande_confirmation_email, str(demande.id))
        _safe_delay(notify_fournisseur_team_new_demande, str(demande.id))
        return demande


class DemandeUpdateSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role__in=("expert", "admin")),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Demande
        fields = ("status", "assigned_to", "internal_notes", "conclusion")

    def update(self, instance, validated_data):
        old_status = instance.status
        old_assigned_id = instance.assigned_to_id
        instance = super().update(instance, validated_data)
        new_status = instance.status
        new_assigned_id = instance.assigned_to_id

        user = self.context["request"].user
        if new_status != old_status:
            DemandeActivity.objects.create(
                demande=instance,
                user=user,
                action="status_changed",
                old_value=old_status,
                new_value=new_status,
            )
            from .tasks import notify_client_demande_status_changed

            _safe_delay(notify_client_demande_status_changed, str(instance.id))
        if new_assigned_id != old_assigned_id and new_assigned_id:
            DemandeActivity.objects.create(
                demande=instance,
                user=user,
                action="assigned",
                old_value=str(old_assigned_id or ""),
                new_value=str(new_assigned_id),
            )
            instance.assigned_at = timezone.now()
            instance.save(update_fields=["assigned_at"])
            from .tasks import notify_expert_assigned

            _safe_delay(notify_expert_assigned, str(instance.id))

        if new_status == "traitee" and not instance.treated_at:
            instance.treated_at = timezone.now()
            instance.save(update_fields=["treated_at"])

        return instance


class DemandeAssignSerializer(serializers.Serializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
         # Accepte tout expert actif, même non vérifié
        queryset=User.objects.filter(role="expert", is_active=True)
    )
 
    def validate_assigned_to(self, expert):
        # Vérification supplémentaire
        if not expert.is_active:
            raise serializers.ValidationError("Cet expert est inactif.")
        return expert
 
    
    def create(self, validated_data):
        demande = validated_data.pop("demande")
        expert = validated_data["assigned_to"]
        user = self.context["request"].user
        old = demande.assigned_to_id
        demande.assigned_to = expert
        demande.assigned_at = timezone.now()
        if demande.status == "en_attente":
            demande.status = "assignee"
        demande.save()
        DemandeActivity.objects.create(
            demande=demande,
            user=user,
            action="assigned",
            old_value=str(old or ""),
            new_value=str(expert.id),
        )
        from .tasks import notify_expert_assigned

        _safe_delay(notify_expert_assigned, str(demande.id))
        return demande
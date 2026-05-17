from datetime import timedelta

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Consultation, ExpertAvailability
from .services import scheduled_within_availability, slot_conflicts_expert

User = get_user_model()


class ConsultationListSerializer(serializers.ModelSerializer):
    consultation_type_display = serializers.CharField(
        source="get_consultation_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    expert_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = (
            "id", "demande", "consultation_type", "consultation_type_display",
            "status", "status_display", "scheduled_at", "duration",
            "ended_at", "expert_name", "client_name", "created_at","report", 
            "notes",
        )
        read_only_fields = fields

    def get_expert_name(self, obj):
        return obj.expert.full_name if obj.expert else None

    def get_client_name(self, obj):
        return obj.client.full_name if obj.client else None


class ConsultationDetailSerializer(serializers.ModelSerializer):
    consultation_type_display = serializers.CharField(
        source="get_consultation_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    expert_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = (
            "id", "demande", "client", "expert", "consultation_type",
            "consultation_type_display", "status", "status_display",
            "scheduled_at", "duration", "ended_at", "meeting_url",
            "meeting_id", "notes", "report", "rating", "rating_comment",
            "cancelled_by", "cancel_reason", "cancelled_at",
            "expert_name", "client_name", "created_at", "updated_at",
        )
        read_only_fields = fields

    def get_expert_name(self, obj):
        return obj.expert.full_name if obj.expert else None

    def get_client_name(self, obj):
        return obj.client.full_name if obj.client else None


class ConsultationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = (
            "demande", "expert", "consultation_type", "scheduled_at",
            "duration", "meeting_url", "meeting_id",
        )
        extra_kwargs = {
            "duration": {"required": False, "default": 45},
            "meeting_url": {"required": False, "allow_blank": True},
            "meeting_id": {"required": False, "allow_blank": True},
        }

    def validate_expert(self, value):
        if getattr(value, "role", None) not in ("expert", "fournisseur", "admin"):
            raise serializers.ValidationError(
                "L'expert doit etre un fournisseur ou un administrateur."
            )
        return value

    def validate(self, attrs):
        demande = attrs["demande"]
        expert = attrs["expert"]
        start = attrs["scheduled_at"]
        duration = attrs.get("duration", 45)
        end = start + timedelta(minutes=duration)
        attrs["client"] = demande.client
        if slot_conflicts_expert(expert.pk, start, end):
            raise serializers.ValidationError(
                {"scheduled_at": "Ce creneau chevauche une autre consultation."}
            )
        if not scheduled_within_availability(expert.pk, start, end):
            raise serializers.ValidationError(
                {"scheduled_at": "Hors des plages de disponibilite de l'expert."}
            )
        return attrs

    def create(self, validated_data):
        c = Consultation.objects.create(**validated_data)
        try:
            from .tasks import (
                send_consultation_confirmation_email,
                send_consultation_calendar_invite,
                schedule_consultation_reminder,
            )
            send_consultation_confirmation_email(str(c.id))
            send_consultation_calendar_invite(str(c.id))
            schedule_consultation_reminder(str(c.id), c.scheduled_at.isoformat())
        except Exception:
            pass
        return c


class ConsultationCancelSerializer(serializers.Serializer):
    cancel_reason = serializers.CharField(required=True, allow_blank=False)


class ConsultationRescheduleSerializer(serializers.Serializer):
    new_scheduled_at = serializers.DateTimeField()

    def validate_new_scheduled_at(self, value):
        return value

    def validate(self, attrs):
        consultation = self.context["consultation"]
        expert = consultation.expert
        start = attrs["new_scheduled_at"]
        duration = consultation.duration
        end = start + timedelta(minutes=duration)
        if slot_conflicts_expert(expert.pk, start, end, exclude_consultation_id=consultation.pk):
            raise serializers.ValidationError(
                {"new_scheduled_at": "Ce creneau chevauche une autre consultation."}
            )
        if not scheduled_within_availability(expert.pk, start, end):
            raise serializers.ValidationError(
                {"new_scheduled_at": "Hors des plages de disponibilite de l'expert."}
            )
        return attrs


class ConsultationReportSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)
    report = serializers.CharField(required=False, allow_blank=True)


class ConsultationRateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    rating_comment = serializers.CharField(required=False, allow_blank=True)


class ExpertAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertAvailability
        fields = ("id", "weekday", "start_time", "end_time", "is_active")
        read_only_fields = ("id",)

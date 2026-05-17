from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "type",
            "title",
            "message",
            "link",
            "is_read",
            "read_at",
            "demande_id",
            "consultation_id",
            "document_id",
            "invoice_id",
            "created_at",
        )
        read_only_fields = (
            "id",
            "type",
            "title",
            "message",
            "link",
            "is_read",
            "read_at",
            "demande_id",
            "consultation_id",
            "document_id",
            "invoice_id",
            "created_at",
        )

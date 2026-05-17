import uuid

from django.db import models

from apps.core.mixins import TimestampMixin


def document_upload_path(instance, filename):
    return f"documents/{instance.owner_id}/{instance.demande_id or 'general'}/{filename}"


class Document(TimestampMixin):
    TYPE_CHOICES = [
        ("contrat", "Contrat"),
        ("rapport", "Rapport"),
        ("piece_jointe", "Pièce jointe"),
        ("facture", "Facture"),
        ("autre", "Autre"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="documents",
    )
    demande = models.ForeignKey(
        "demandes.Demande",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    consultation = models.ForeignKey(
        "consultations.Consultation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )

    name = models.CharField(max_length=255)
    file = models.FileField(upload_to=document_upload_path)
    file_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default="autre"
    )
    mime_type = models.CharField(max_length=100)
    size = models.PositiveBigIntegerField()

    is_private = models.BooleanField(default=False)

    class Meta:
        db_table = "documents"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "demande"]),
            models.Index(fields=["file_type"]),
        ]

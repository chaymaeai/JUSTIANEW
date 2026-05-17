import uuid

from django.db import models

from apps.core.mixins import TimestampMixin


class Notification(TimestampMixin):
    TYPE_CHOICES = [
        ("nouvelle_demande", "Nouvelle demande"),
        ("demande_assignee", "Demande assignée"),
        ("demande_traitee", "Demande traitée"),
        ("statut_modifie", "Statut modifié"),
        ("rdv_confirme", "RDV confirmé"),
        ("rdv_rappel", "Rappel RDV"),
        ("rdv_annule", "RDV annulé"),
        ("nouveau_message", "Nouveau message"),
        ("document_ajoute", "Document ajouté"),
        ("rapport_disponible", "Rapport disponible"),
        ("facture_disponible", "Facture disponible"),
        ("facture_en_retard", "Facture en retard"),
        ("nouveau_client", "Nouveau client"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=200, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    demande_id = models.UUIDField(null=True, blank=True)
    consultation_id = models.UUIDField(null=True, blank=True)
    document_id = models.UUIDField(null=True, blank=True)
    invoice_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "created_at"]),
        ]

import uuid

from django.db import models

from apps.core.mixins import TimestampMixin


class Demande(TimestampMixin):
    DOMAIN_CHOICES = [
        ("droit_affaires", "Droit des affaires"),
        ("rgpd", "RGPD / Cybersécurité"),
        ("droit_ia", "Droit de l'IA"),
        ("propriete_intellectuelle", "Propriété intellectuelle"),
        ("droit_numerique", "Droit du numérique"),
        ("immobilier", "Immobilier"),
        ("gouvernance", "Gouvernance"),
    ]
    STATUS_CHOICES = [
        ("en_attente", "En attente"),
        ("assignee", "Assignée"),
        ("en_cours", "En cours"),
        ("en_revision", "En révision"),
        ("traitee", "Traitée"),
        ("annulee", "Annulée"),
    ]
    URGENCY_CHOICES = [
        ("normale", "Normale"),
        ("urgente", "Urgente"),
        ("critique", "Critique"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, editable=False)

    client = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="demandes",
        limit_choices_to={"role": "client"},
    )
    assigned_to = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_demandes",
        limit_choices_to={"role__in": ["expert", "admin"]},
    )

    domain = models.CharField(max_length=50, choices=DOMAIN_CHOICES)
    description = models.TextField()
    urgency = models.CharField(
        max_length=20, choices=URGENCY_CHOICES, default="normale"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="en_attente"
    )

    internal_notes = models.TextField(blank=True)
    conclusion = models.TextField(blank=True)

    assigned_at = models.DateTimeField(null=True, blank=True)
    treated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "demandes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["domain"]),
            models.Index(fields=["urgency", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            from django.utils import timezone

            year = timezone.now().year
            prefix = f"JUS-{year}-"
            qs = Demande.objects.filter(reference__startswith=prefix)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            n = qs.count() + 1
            self.reference = f"{prefix}{n:04d}"
        super().save(*args, **kwargs)


class DemandeActivity(TimestampMixin):
    ACTION_CHOICES = [
        ("created", "Créée"),
        ("assigned", "Assignée"),
        ("status_changed", "Statut modifié"),
        ("note_added", "Note ajoutée"),
        ("doc_added", "Document ajouté"),
        ("concluded", "Clôturée"),
    ]

    demande = models.ForeignKey(
        Demande, on_delete=models.CASCADE, related_name="activities"
    )
    user = models.ForeignKey(
        "authentication.User", on_delete=models.SET_NULL, null=True
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    old_value = models.CharField(max_length=100, blank=True)
    new_value = models.CharField(max_length=100, blank=True)
    comment = models.TextField(blank=True)

    class Meta:
        db_table = "demande_activities"
        ordering = ["-created_at"]


class DemandeMessage(TimestampMixin):
    demande = models.ForeignKey(
        Demande, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey("authentication.User", on_delete=models.CASCADE)
    content = models.TextField()
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "demande_messages"
        ordering = ["created_at"]

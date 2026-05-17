import uuid

from django.db import models

from apps.core.mixins import TimestampMixin


class Consultation(TimestampMixin):
    TYPE_CHOICES = [
        ("visio", "Visioconférence"),
        ("telephone", "Téléphone"),
        ("presentiel", "Présentiel"),
    ]
    STATUS_CHOICES = [
        ("planifiee", "Planifiée"),
        ("confirmee", "Confirmée"),
        ("en_cours", "En cours"),
        ("terminee", "Terminée"),
        ("annulee", "Annulée"),
        ("reportee", "Reportée"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    demande = models.ForeignKey(
        "demandes.Demande",
        on_delete=models.CASCADE,
        related_name="consultations",
    )
    client = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="client_consultations",
    )
    expert = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="expert_consultations",
    )

    consultation_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="planifiee"
    )

    scheduled_at = models.DateTimeField()
    duration = models.PositiveIntegerField(default=45)
    ended_at = models.DateTimeField(null=True, blank=True)

    meeting_url = models.URLField(blank=True)
    meeting_id = models.CharField(max_length=100, blank=True)

    notes = models.TextField(blank=True)
    report = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_comment = models.TextField(blank=True)

    cancelled_by = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_consultations",
    )
    cancel_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "consultations"
        ordering = ["-scheduled_at"]
        indexes = [
            models.Index(fields=["client", "status"]),
            models.Index(fields=["expert", "scheduled_at"]),
            models.Index(fields=["scheduled_at"]),
        ]


class ExpertAvailability(models.Model):
    WEEKDAY_CHOICES = [(i, day) for i, day in enumerate(
        ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    )]

    expert = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="availabilities",
    )
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "expert_availabilities"
        constraints = [
            models.UniqueConstraint(
                fields=["expert", "weekday", "start_time"],
                name="uniq_expert_weekday_start_time",
            ),
        ]


class BlockedSlot(models.Model):
    expert = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="blocked_slots",
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "blocked_slots"

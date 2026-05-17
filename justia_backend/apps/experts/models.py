from decimal import Decimal

from django.db import models

from apps.core.mixins import TimestampMixin


class ExpertProfile(TimestampMixin):
    user = models.OneToOneField(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="expert_profile",
    )
    specializations = models.JSONField(default=list)
    bio = models.TextField(blank=True)
    years_experience = models.PositiveIntegerField(default=0)
    bar_number = models.CharField(max_length=50, blank=True)
    languages = models.JSONField(default=list)
    max_concurrent_cases = models.PositiveIntegerField(default=10)
    is_available = models.BooleanField(default=True)
    rating_avg = models.DecimalField(
        max_digits=3, decimal_places=2, default=Decimal("0")
    )
    rating_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "expert_profiles"

    def update_rating(self):
        from apps.consultations.models import Consultation

        ratings = list(
            Consultation.objects.filter(
                expert=self.user, rating__isnull=False
            ).values_list("rating", flat=True)
        )
        if ratings:
            self.rating_avg = Decimal(sum(ratings)) / Decimal(len(ratings))
            self.rating_count = len(ratings)
        else:
            self.rating_avg = Decimal("0")
            self.rating_count = 0
        self.save(
            update_fields=["rating_avg", "rating_count", "updated_at"]
        )

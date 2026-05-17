from django.contrib import admin

from .models import BlockedSlot, Consultation, ExpertAvailability


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "demande",
        "client",
        "expert",
        "consultation_type",
        "status",
        "scheduled_at",
        "duration",
    )
    list_filter = ("status", "consultation_type")
    raw_id_fields = ("demande", "client", "expert", "cancelled_by")
    search_fields = ("meeting_id", "notes", "report")


@admin.register(ExpertAvailability)
class ExpertAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("expert", "weekday", "start_time", "end_time", "is_active")
    raw_id_fields = ("expert",)


@admin.register(BlockedSlot)
class BlockedSlotAdmin(admin.ModelAdmin):
    list_display = ("expert", "start_at", "end_at", "reason")
    raw_id_fields = ("expert",)

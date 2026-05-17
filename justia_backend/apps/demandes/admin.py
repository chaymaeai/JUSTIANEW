from django.contrib import admin

from .models import Demande, DemandeActivity, DemandeMessage


@admin.register(Demande)
class DemandeAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "domain",
        "status",
        "urgency",
        "client",
        "assigned_to",
        "created_at",
    )
    list_filter = ("status", "domain", "urgency")
    search_fields = ("reference", "description", "client__email")
    raw_id_fields = ("client", "assigned_to")
    readonly_fields = ("id", "reference", "created_at", "updated_at")


@admin.register(DemandeActivity)
class DemandeActivityAdmin(admin.ModelAdmin):
    list_display = ("demande", "action", "user", "created_at")
    list_filter = ("action",)
    raw_id_fields = ("demande", "user")


@admin.register(DemandeMessage)
class DemandeMessageAdmin(admin.ModelAdmin):
    list_display = ("demande", "sender", "created_at", "is_read")
    raw_id_fields = ("demande", "sender")

from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "recipient", "is_read", "created_at")
    list_filter = ("type", "is_read")
    raw_id_fields = ("recipient",)
    readonly_fields = ("id", "created_at", "updated_at")

from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("name", "file_type", "owner", "demande", "size", "created_at")
    list_filter = ("file_type", "is_private")
    search_fields = ("name",)
    raw_id_fields = ("owner", "demande", "consultation")

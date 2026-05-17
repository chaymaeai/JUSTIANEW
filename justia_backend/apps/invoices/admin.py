from django.contrib import admin

from .models import Invoice, InvoiceLine


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "client", "status", "total", "currency", "due_date", "created_at")
    list_filter = ("status", "currency")
    raw_id_fields = ("client", "created_by", "demande")
    inlines = [InvoiceLineInline]

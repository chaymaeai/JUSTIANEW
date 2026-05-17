import uuid
from decimal import Decimal

from django.db import models

from apps.core.mixins import TimestampMixin


class Invoice(TimestampMixin):
    STATUS_CHOICES = [
        ("brouillon", "Brouillon"),
        ("envoyee", "Envoyée"),
        ("en_attente", "En attente de paiement"),
        ("payee", "Payée"),
        ("en_retard", "En retard"),
        ("annulee", "Annulée"),
    ]
    CURRENCY_CHOICES = [("MAD", "MAD"), ("EUR", "EUR"), ("USD", "USD")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=30, unique=True, editable=False)

    client = models.ForeignKey(
        "authentication.User",
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    created_by = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_invoices",
    )
    demande = models.ForeignKey(
        "demandes.Demande",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="brouillon"
    )
    currency = models.CharField(
        max_length=5, choices=CURRENCY_CHOICES, default="MAD"
    )

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("20.00"))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_ref = models.CharField(max_length=100, blank=True)

    notes = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to="invoices/pdf/", blank=True, null=True)

    class Meta:
        db_table = "invoices"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        from datetime import date

        if not self.number:
            today = date.today()
            year, month = today.year, today.month
            prefix = f"FAC-{year}{month:02d}-"
            qs = Invoice.objects.filter(number__startswith=prefix)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            count = qs.count() + 1
            self.number = f"{prefix}{count:04d}"

        rate = self.tax_rate or Decimal("0")
        self.tax_amount = (self.subtotal * (rate / Decimal("100"))).quantize(
            Decimal("0.01")
        )
        self.total = (self.subtotal + self.tax_amount).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)


class InvoiceLine(models.Model):
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="lines"
    )
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0")
    )

    class Meta:
        db_table = "invoice_lines"

    def save(self, *args, **kwargs):
        q = self.quantity or Decimal("0")
        p = self.unit_price or Decimal("0")
        self.total = (q * p).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)


class Payment(TimestampMixin):
    """
    Enregistre chaque tentative de paiement.
    Une Invoice peut avoir plusieurs Payment (retries).
    """
    PROVIDER_CHOICES = [
        ("stripe", "Stripe"),
        ("paypal", "PayPal"),
        ("manual", "Manuel"),
    ]
    STATUS_CHOICES = [
        ("pending",  "En attente"),
        ("paid",     "Payé"),
        ("failed",   "Échoué"),
        ("expired",  "Expiré"),
        ("refunded", "Remboursé"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    provider             = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default="stripe")
    provider_session_id  = models.CharField(max_length=200, blank=True, db_index=True)
    provider_payment_ref = models.CharField(max_length=200, blank=True)

    amount   = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=5, default="MAD")
    status   = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    paid_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "invoice_payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.invoice.number} — {self.provider} — {self.status}"
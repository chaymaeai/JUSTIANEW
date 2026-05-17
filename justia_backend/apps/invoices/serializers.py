from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import Invoice, InvoiceLine

User = get_user_model()


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ("id", "description", "quantity", "unit_price", "total")
        read_only_fields = ("id", "total")


class InvoiceListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id",
            "number",
            "client",
            "created_by",
            "demande",
            "status",
            "status_display",
            "currency",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "total",
            "due_date",
            "paid_at",
            "created_at",
        )
        read_only_fields = fields


class InvoiceDetailSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id",
            "number",
            "client",
            "created_by",
            "demande",
            "status",
            "status_display",
            "currency",
            "subtotal",
            "tax_rate",
            "tax_amount",
            "total",
            "due_date",
            "paid_at",
            "payment_ref",
            "notes",
            "pdf_file",
            "lines",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class InvoiceLineWriteSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=500)
    quantity = serializers.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal("1")
    )
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class InvoiceCreateSerializer(serializers.Serializer):
    client_id = serializers.UUIDField()
    demande_id = serializers.UUIDField(required=False, allow_null=True)
    lines = serializers.ListField(child=InvoiceLineWriteSerializer(), min_length=1)
    due_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_blank=True)
    currency = serializers.ChoiceField(choices=["MAD", "EUR", "USD"], default="MAD")
    tax_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("20.00")
    )
    send_to_client = serializers.BooleanField(default=False)

    def validate_client_id(self, value):
        try:
            u = User.objects.get(pk=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Client introuvable.")
        if getattr(u, "role", None) != "client":
            raise serializers.ValidationError("L’utilisateur doit être un client.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        lines_data = validated_data.pop("lines")
        send_to_client = validated_data.pop("send_to_client")
        demande_id = validated_data.pop("demande_id", None)
        client_id = validated_data.pop("client_id")
        tax_rate = validated_data.pop("tax_rate")
        notes = validated_data.get("notes", "")
        currency = validated_data.pop("currency")
        due_date = validated_data["due_date"]

        subtotal = Decimal("0")
        for row in lines_data:
            subtotal += row["quantity"] * row["unit_price"]
        subtotal = subtotal.quantize(Decimal("0.01"))

        with transaction.atomic():
            invoice = Invoice.objects.create(
                client_id=client_id,
                created_by=request.user,
                demande_id=demande_id,
                subtotal=subtotal,
                tax_rate=tax_rate,
                tax_amount=Decimal("0"),
                total=Decimal("0"),
                due_date=due_date,
                notes=notes,
                currency=currency,
                status="brouillon",
            )
            for row in lines_data:
                InvoiceLine.objects.create(
                    invoice=invoice,
                    description=row["description"],
                    quantity=row["quantity"],
                    unit_price=row["unit_price"],
                )
            invoice.subtotal = sum(
                (ln.total for ln in invoice.lines.all()), Decimal("0")
            )
            invoice.save()

        if send_to_client:
          from .tasks import deliver_invoice_to_client
          try:
             deliver_invoice_to_client(str(invoice.id))
          except Exception:
            pass
        return invoice


class InvoiceMarkPaidSerializer(serializers.Serializer):
    payment_ref = serializers.CharField(max_length=100)

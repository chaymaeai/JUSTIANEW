from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.http import FileResponse, Http404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from apps.core.permissions import IsFournisseurOrAdmin

from .filters import InvoiceFilter
from .models import Invoice
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    InvoiceListSerializer,
    InvoiceMarkPaidSerializer,
)
from .tasks import deliver_invoice_to_client, generate_invoice_pdf, save_invoice_pdf_file


def _invoice_queryset_for(user):
    role = getattr(user, "role", None)
    qs = Invoice.objects.select_related("client", "created_by", "demande").prefetch_related(
        "lines"
    )
    if role == "client":
        return qs.filter(client=user)
    if role == "expert":
        return qs.filter(created_by=user)
    if role == "admin":
        return qs
    return Invoice.objects.none()


class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = InvoiceFilter
    ordering_fields = ("created_at", "due_date", "total", "number")
    ordering = ("-created_at",)

    def get_queryset(self):
        return _invoice_queryset_for(self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return InvoiceListSerializer
        if self.action == "create":
            return InvoiceCreateSerializer
        return InvoiceDetailSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsFournisseurOrAdmin()]
        if self.action in ("send", "mark_paid"):
            return [IsFournisseurOrAdmin()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        output = InvoiceDetailSerializer(invoice, context={"request": request}).data
        return Response(output, status=status.HTTP_201_CREATED)

    @extend_schema(tags=["invoices"])
    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        invoice = self.get_object()
        if getattr(request.user, "role", None) == "fournisseur" and invoice.created_by_id != request.user.id:
            raise PermissionDenied()
        deliver_invoice_to_client(str(invoice.id))
        invoice.refresh_from_db()
        return Response(InvoiceDetailSerializer(invoice, context={"request": request}).data)

    @extend_schema(tags=["invoices"])
    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        if getattr(request.user, "role", None) == "fournisseur" and invoice.created_by_id != request.user.id:
            raise PermissionDenied()
        ser = InvoiceMarkPaidSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        invoice.payment_ref = ser.validated_data["payment_ref"]
        invoice.status = "payee"
        invoice.paid_at = timezone.now()
        invoice.save()
        from apps.notifications.services import notify

        notify(
            invoice.client_id,
            "facture_disponible",
            "Paiement enregistré",
            f"Le paiement de la facture {invoice.number} a été enregistré.",
            link=f"/espace-client/factures/{invoice.id}",
            invoice_id=invoice.id,
        )
        return Response(InvoiceDetailSerializer(invoice, context={"request": request}).data)

    @extend_schema(tags=["invoices"])
    @action(detail=True, methods=["get"], url_path="pdf")
    def download_pdf(self, request, pk=None):
        invoice = self.get_object()
        if not invoice.pdf_file:
            try:
                save_invoice_pdf_file(invoice)
                invoice.refresh_from_db()
            except ImportError:
                generate_invoice_pdf.delay(str(invoice.id))
                return Response(
                    {"detail": "PDF en cours de génération."},
                    status=status.HTTP_202_ACCEPTED,
                )
        if not invoice.pdf_file:
            raise Http404()
        return FileResponse(
            invoice.pdf_file.open("rb"),
            as_attachment=True,
            filename=f"{invoice.number}.pdf",
        )

    @extend_schema(tags=["invoices"])
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        qs = _invoice_queryset_for(request.user)
        paid = qs.filter(status="payee")
        total_revenue = paid.aggregate(s=Sum("total"))["s"] or Decimal("0")
        pending_amount = (
            qs.filter(status__in=("en_attente", "envoyee", "brouillon")).aggregate(
                s=Sum("total")
            )["s"]
            or Decimal("0")
        )
        overdue_amount = (
            qs.filter(status="en_retard").aggregate(s=Sum("total"))["s"] or Decimal("0")
        )
        today = date.today()
        this_month = qs.filter(
            created_at__year=today.year, created_at__month=today.month
        ).aggregate(s=Sum("total"))["s"] or Decimal("0")
        if today.month == 1:
            ly, lm = today.year - 1, 12
        else:
            ly, lm = today.year, today.month - 1
        last_month = qs.filter(
            created_at__year=ly, created_at__month=lm
        ).aggregate(s=Sum("total"))["s"] or Decimal("0")
        by_currency = []
        for cur, _ in Invoice.CURRENCY_CHOICES:
            s = qs.filter(currency=cur).aggregate(t=Sum("total"))["t"] or Decimal("0")
            c = qs.filter(currency=cur).count()
            by_currency.append({"currency": cur, "count": c, "total": str(s)})
        return Response(
            {
                "total_revenue": str(total_revenue),
                "pending_amount": str(pending_amount),
                "overdue_amount": str(overdue_amount),
                "this_month": str(this_month),
                "last_month": str(last_month),
                "by_currency": by_currency,
            }
        )

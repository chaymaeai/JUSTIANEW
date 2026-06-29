"""
apps/invoices/tasks.py
"""
from datetime import date

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage

from .invoice_pdf import render_invoice_pdf_bytes
from .models import Invoice


def save_invoice_pdf_file(invoice: Invoice) -> None:
    data = render_invoice_pdf_bytes(invoice)
    invoice.pdf_file.save(
        f"invoice_{invoice.number}.pdf",
        ContentFile(data),
        save=True,
    )


@shared_task
def generate_invoice_pdf(invoice_id: str) -> None:
    try:
        invoice = Invoice.objects.prefetch_related("lines").select_related(
            "client", "created_by"
        ).get(pk=invoice_id)
    except Invoice.DoesNotExist:
        return
    try:
        save_invoice_pdf_file(invoice)
    except ImportError:
        return


def send_invoice_email_sync(invoice_id: str) -> None:
    try:
        invoice = Invoice.objects.select_related("client").prefetch_related("lines").get(
            pk=invoice_id
        )
    except Invoice.DoesNotExist:
        return
    if not invoice.pdf_file:
        try:
            save_invoice_pdf_file(invoice)
            invoice.refresh_from_db()
        except ImportError:
            pass
    email = EmailMessage(
        subject=f"Facture {invoice.number} — JUSTIA",
        body=f"Bonjour {invoice.client.first_name},\n\nVeuillez trouver votre facture en pièce jointe.\n\nJUSTIA",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[invoice.client.email],
    )
    if invoice.pdf_file:
        invoice.pdf_file.open("rb")
        email.attach(
            f"{invoice.number}.pdf",
            invoice.pdf_file.read(),
            "application/pdf",
        )
        invoice.pdf_file.close()
    email.send(fail_silently=True)


@shared_task
def send_invoice_email(invoice_id: str) -> None:
    send_invoice_email_sync(invoice_id)


def deliver_invoice_to_client(invoice_id: str) -> None:
    from apps.notifications.services import notify

    try:
        invoice = Invoice.objects.get(pk=invoice_id)
    except Invoice.DoesNotExist:
        return
    try:
        save_invoice_pdf_file(invoice)
    except ImportError:
        pass
    invoice.refresh_from_db()
    send_invoice_email_sync(invoice_id)
    invoice = Invoice.objects.get(pk=invoice_id)
    invoice.status = "envoyee"
    invoice.save(update_fields=["status"])
    notify(
        invoice.client_id,
        "facture_disponible",
        "Nouvelle facture",
        f"La facture {invoice.number} est disponible.",
        link=f"/espace-client/factures/{invoice.id}",
        invoice_id=invoice.id,
    )


@shared_task
def send_invoice_to_client(invoice_id: str) -> None:
    deliver_invoice_to_client(invoice_id)


@shared_task
def check_overdue_invoices() -> None:
    from apps.notifications.services import notify

    today = date.today()
    overdue = Invoice.objects.filter(
        due_date__lt=today,
        status="en_attente",
    ).select_related("client")
    for invoice in overdue:
        invoice.status = "en_retard"
        invoice.save(update_fields=["status", "updated_at"])
        notify(
            invoice.client_id,
            "facture_en_retard",
            "Facture en retard",
            f"La facture {invoice.number} est en retard de paiement.",
            link=f"/espace-client/factures/{invoice.id}",
            invoice_id=invoice.id,
        )
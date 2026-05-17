"""
apps/invoices/payment_views.py
════════════════════════════════════════════════════════════
Endpoints :
    POST /api/invoices/{id}/create-payment-session/
    POST /api/payments/webhook/
════════════════════════════════════════════════════════════
"""
import logging

import stripe
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import notify

from .models import Invoice, Payment

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


# ══════════════════════════════════════════════════════════════
# 1. CREATE PAYMENT SESSION
# ══════════════════════════════════════════════════════════════
class CreatePaymentSessionView(APIView):
    """
    POST /api/invoices/{invoice_id}/create-payment-session/
    Crée une Stripe Checkout Session et retourne l'URL de paiement.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        # ── Récupérer la facture ─────────────────────────────
        try:
            invoice = Invoice.objects.select_related("client").get(pk=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"detail": "Facture introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # ── Contrôle d'accès ─────────────────────────────────
        if getattr(request.user, "role", None) == "client" and invoice.client_id != request.user.id:
            return Response({"detail": "Accès non autorisé."}, status=status.HTTP_403_FORBIDDEN)

        # ── Facture déjà payée ───────────────────────────────
        if invoice.status == "payee":
            return Response({"detail": "Cette facture est déjà payée."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Éviter les doublons : réutiliser session active ──
        existing = Payment.objects.filter(
            invoice=invoice,
            status="pending",
            provider="stripe",
        ).order_by("-created_at").first()

        if existing and existing.provider_session_id:
            try:
                session = stripe.checkout.Session.retrieve(existing.provider_session_id)
                if session.status == "open":
                    return Response({"checkout_url": session.url})
            except stripe.error.StripeError:
                pass  # session expirée → en créer une nouvelle

        # ── Convertir en centimes ────────────────────────────
        amount_cents = int(invoice.total * 100)
        currency = invoice.currency.lower()
        # Stripe n'accepte pas MAD — fallback EUR
        if currency == "mad":
            currency = "eur"

        # ── Créer la Stripe Checkout Session ─────────────────
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": currency,
                        "product_data": {
                            "name": f"Facture {invoice.number}",
                            "description": f"Justia — dossier juridique",
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                customer_email=invoice.client.email,
                metadata={
                    "invoice_id": str(invoice.id),
                    "invoice_number": invoice.number,
                },
                success_url=(
                    f"{settings.FRONTEND_URL}/espace-client/factures/{invoice.id}?payment=success"
                ),
                cancel_url=(
                    f"{settings.FRONTEND_URL}/espace-client/factures/{invoice.id}?payment=cancelled"
                ),
            )
        except stripe.error.StripeError as e:
            logger.error("Stripe session creation failed: %s", e)
            return Response(
                {"detail": "Erreur Stripe : impossible de créer la session de paiement."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # ── Enregistrer le Payment en base ───────────────────
        Payment.objects.create(
            invoice=invoice,
            provider="stripe",
            provider_session_id=session.id,
            amount=invoice.total,
            currency=invoice.currency,
            status="pending",
        )

        return Response({"checkout_url": session.url})


# ══════════════════════════════════════════════════════════════
# 2. STRIPE WEBHOOK
# ══════════════════════════════════════════════════════════════
class StripeWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Reçoit les événements Stripe et met à jour Invoice + Payment.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # pas de JWT pour les webhooks

    @csrf_exempt
    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        # ── Vérifier la signature Stripe ─────────────────────
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.warning("Stripe webhook: payload invalide")
            return Response({"detail": "Payload invalide."}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe webhook: signature invalide")
            return Response({"detail": "Signature invalide."}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        data_object = event["data"]["object"]

        logger.info("Stripe event reçu : %s", event_type)

        # ── checkout.session.completed → PAIEMENT RÉUSSI ─────
        if event_type == "checkout.session.completed":
            _handle_payment_success(data_object)

        # ── checkout.session.expired → SESSION EXPIRÉE ───────
        elif event_type == "checkout.session.expired":
            _handle_session_expired(data_object)

        # ── payment_intent.payment_failed → ÉCHEC ────────────
        elif event_type == "payment_intent.payment_failed":
            _handle_payment_failed(data_object)

        return Response({"received": True})


# ══════════════════════════════════════════════════════════════
# HANDLERS INTERNES
# ══════════════════════════════════════════════════════════════
def _handle_payment_success(session):
    invoice_id = session.get("metadata", {}).get("invoice_id")
    session_id = session.get("id")
    payment_intent = session.get("payment_intent", "")

    if not invoice_id:
        logger.error("Webhook success: invoice_id manquant dans metadata")
        return

    try:
        invoice = Invoice.objects.select_related("client").get(pk=invoice_id)
    except Invoice.DoesNotExist:
        logger.error("Webhook success: Invoice %s introuvable", invoice_id)
        return

    # Idempotence — ne pas retraiter si déjà payée
    if invoice.status == "payee":
        logger.info("Invoice %s déjà marquée payée — ignoré", invoice_id)
        return

    # Mettre à jour la facture
    invoice.status = "payee"
    invoice.paid_at = timezone.now()
    invoice.payment_ref = payment_intent or session_id
    invoice.save(update_fields=["status", "paid_at", "payment_ref"])

    # Mettre à jour le Payment
    Payment.objects.filter(
        invoice=invoice,
        provider_session_id=session_id,
    ).update(status="paid", paid_at=timezone.now())

    # Notifier le client
    try:
        notify(
            invoice.client_id,
            "facture_disponible",
            "Paiement confirmé",
            f"Votre paiement pour la facture {invoice.number} a été confirmé.",
            link=f"/espace-client/factures/{invoice.id}",
            invoice_id=invoice.id,
        )
    except Exception:
        logger.exception("Notification échec pour invoice %s", invoice_id)

    logger.info("✅ Invoice %s marquée PAYÉE", invoice.number)


def _handle_session_expired(session):
    session_id = session.get("id")
    Payment.objects.filter(
        provider_session_id=session_id,
        status="pending",
    ).update(status="expired")
    logger.info("Session Stripe expirée : %s", session_id)


def _handle_payment_failed(payment_intent):
    payment_intent_id = payment_intent.get("id", "")
    # Retrouver via payment_ref si déjà lié
    Payment.objects.filter(
        provider_session_id=payment_intent_id,
        status="pending",
    ).update(status="failed")
    logger.warning("❌ Paiement échoué : %s", payment_intent_id)
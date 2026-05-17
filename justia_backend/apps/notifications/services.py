from typing import Any
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model

from .models import Notification
from .serializers import NotificationSerializer
from .tasks import send_notification_email

User = get_user_model()

_TYPE_EMAIL_PREF = {
    "nouvelle_demande": "notif_email_demande",
    "demande_assignee": "notif_email_demande",
    "demande_traitee": "notif_email_demande",
    "statut_modifie": "notif_email_demande",
    "document_ajoute": "notif_email_demande",
    "nouveau_message": "notif_email_demande",
    "rdv_confirme": "notif_email_rdv",
    "rdv_rappel": "notif_email_rdv",
    "rdv_annule": "notif_email_rdv",
    "rapport_disponible": "notif_email_demande",
    "facture_disponible": "notif_email_facture",
    "facture_en_retard": "notif_email_facture",
    "nouveau_client": "notif_email_demande",
}


def should_send_email(user: User, notif_type: str) -> bool:
    pref = _TYPE_EMAIL_PREF.get(notif_type)
    if not pref:
        return True
    return bool(getattr(user, pref, True))


def send_ws_notification(user_id, data: dict) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    uid = str(user_id)
    async_to_sync(layer.group_send)(
        f"user_{uid}",
        {"type": "notification_message", "data": data},
    )


def notify(
    recipient_id: UUID | str,
    notif_type: str,
    title: str,
    message: str,
    link: str = "",
    **refs: Any,
) -> Notification:
    recipient = User.objects.get(pk=recipient_id)
    n = Notification.objects.create(
        recipient=recipient,
        type=notif_type,
        title=title,
        message=message,
        link=link or "",
        demande_id=refs.get("demande_id"),
        consultation_id=refs.get("consultation_id"),
        document_id=refs.get("document_id"),
        invoice_id=refs.get("invoice_id"),
    )
    payload = NotificationSerializer(n, context={}).data
    send_ws_notification(recipient_id, payload)
    if should_send_email(recipient, notif_type):
        send_notification_email.delay(str(n.id))
    return n


def notify_staff_new_client(client) -> None:
    """Notify all active experts (fournisseur) and admins when a client verifies their account."""
    import logging

    logger = logging.getLogger(__name__)
    name = (client.full_name or "").strip() or client.email
    link = f"/fournisseur/clients/{client.id}"
    message = f"{name} a verifie son compte ({client.email})."
    staff = User.objects.filter(
        role__in=("fournisseur", "admin"), is_active=True
    ).only("id")
    for u in staff.iterator():
        try:
            notify(
                u.id,
                "nouveau_client",
                "Nouveau client inscrit",
                message,
                link=link,
            )
        except Exception:
            logger.exception(
                "Failed to notify staff about new client",
                extra={"staff_id": str(u.id), "client_id": str(client.id)},
            )

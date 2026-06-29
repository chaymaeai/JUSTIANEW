from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone


@shared_task
def send_demande_confirmation_email(demande_id: str) -> None:
    from .models import Demande

    try:
        d = Demande.objects.select_related("client").get(pk=demande_id)
    except Demande.DoesNotExist:
        return
    send_mail(
        subject=f"Demande reçue — {d.reference}",
        message=f"Votre demande {d.reference} a bien été enregistrée.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[d.client.email],
        fail_silently=True,
    )


@shared_task
def send_demande_confirmation(demande_id: str) -> None:
    send_demande_confirmation_email(demande_id)


@shared_task
def notify_fournisseur_team_new_demande(demande_id: str) -> None:
    from django.contrib.auth import get_user_model
    from .models import Demande

    User = get_user_model()
    try:
        d = Demande.objects.get(pk=demande_id)
    except Demande.DoesNotExist:
        return

    experts = User.objects.filter(role__in=("expert", "admin"), is_active=True)
    emails = list(experts.values_list("email", flat=True))

    # ✅ Crée une notification en base pour chaque expert
    try:
        from apps.notifications.services import notify
        for expert in experts:
            notify(
                expert.id,
                "nouvelle_demande",
                "Nouvelle demande",
                f"Une nouvelle demande {d.reference} nécessite votre attention.",
                link=f"/fournisseur/demandes",
                demande_id=str(d.id),
            )
    except Exception:
        pass

    # ✅ Envoie aussi l'email
    if emails:
        send_mail(
            subject=f"Nouvelle demande JUSTIA — {d.reference}",
            message=f"Une nouvelle demande {d.reference} nécessite votre attention.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=emails[:10],
            fail_silently=True,
        )

@shared_task
def notify_team_new_demande(demande_id: str) -> None:
    notify_fournisseur_team_new_demande(demande_id)


@shared_task
def notify_client_demande_status_changed(demande_id: str) -> None:
    from .models import Demande

    try:
        d = Demande.objects.select_related("client").get(pk=demande_id)
    except Demande.DoesNotExist:
        return
    send_mail(
        subject=f"Mise à jour — {d.reference}",
        message=f"Le statut de votre demande est : {d.get_status_display()}.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[d.client.email],
        fail_silently=True,
    )


@shared_task
def send_demande_status_update(
    demande_id: str,
    old_status: str | None = None,
    new_status: str | None = None,
) -> None:
    notify_client_demande_status_changed(demande_id)


@shared_task
def notify_expert_assigned(demande_id: str) -> None:
    from .models import Demande

    try:
        d = Demande.objects.select_related("assigned_to").get(pk=demande_id)
    except Demande.DoesNotExist:
        return
    if not d.assigned_to or not d.assigned_to.email:
        return
    send_mail(
        subject=f"Demande assignée — {d.reference}",
        message=f"La demande {d.reference} vous a été assignée.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[d.assigned_to.email],
        fail_silently=True,
    )


@shared_task
def notify_demande_message_recipient(message_id: str) -> None:
    from .models import DemandeMessage

    try:
        msg = DemandeMessage.objects.select_related(
            "demande__client", "demande__assigned_to", "sender"
        ).get(pk=message_id)
    except DemandeMessage.DoesNotExist:
        return
    d = msg.demande
    recipient = None
    if msg.sender_id == d.client_id and d.assigned_to_id:
        recipient = d.assigned_to.email
    elif d.client_id and msg.sender_id != d.client_id:
        recipient = d.client.email
    if not recipient:
        return
    send_mail(
        subject=f"Nouveau message — {d.reference}",
        message="Vous avez reçu un nouveau message sur votre demande.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=True,
    )


@shared_task
def check_overdue_demandes() -> None:
    """Alert team about demandes inactive for more than 48 hours."""
    from .models import Demande

    cutoff = timezone.now() - timezone.timedelta(hours=48)
    stale = Demande.objects.filter(
        status__in=("en_attente", "assignee", "en_cours", "en_revision"),
        updated_at__lt=cutoff,
    )
    for demande in stale:
        notify_fournisseur_team_new_demande(str(demande.id))

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_verification_email(user_id: str, token_uuid: str) -> None:
    from .models import User

    user = User.objects.get(pk=user_id)
    link = (
        f"{settings.API_BASE_URL.rstrip('/')}/api/auth/verify-email/{token_uuid}/"
    )
    send_mail(
        subject="Vérifiez votre adresse email — JUSTIA",
        message=f"Bonjour {user.first_name},\n\n"
        f"Confirmez votre email en ouvrant ce lien :\n{link}\n\n"
        "Si vous n’avez pas créé de compte, ignorez ce message.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


@shared_task
def send_password_reset_email(user_id: str, token_uuid: str) -> None:
    from .models import User

    user = User.objects.get(pk=user_id)
    link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token_uuid}"
    send_mail(
        subject="Réinitialisation du mot de passe — JUSTIA",
        message=f"Bonjour {user.first_name},\n\n"
        f"Réinitialisez votre mot de passe :\n{link}\n\n"
        "Ce lien expire dans 2 heures. Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


@shared_task
def send_welcome_email(user_id: str) -> None:
    from .models import User

    user = User.objects.get(pk=user_id)
    send_mail(
        subject="Bienvenue sur JUSTIA",
        message=(
            f"Bonjour {user.first_name},\n\n"
            "Votre compte est maintenant vérifié. Bienvenue sur JUSTIA."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


@shared_task
def notify_staff_new_client_task(client_id: str) -> None:
    import logging

    from apps.notifications.services import notify_staff_new_client

    from .models import User

    logger = logging.getLogger(__name__)
    try:
        client = User.objects.get(pk=client_id, role="client")
    except User.DoesNotExist:
        return
    try:
        notify_staff_new_client(client)
    except Exception:
        logger.exception(
            "notify_staff_new_client_task failed", extra={"client_id": client_id}
        )

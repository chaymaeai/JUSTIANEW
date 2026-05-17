from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_notification_email(notification_id: str) -> None:
    from .models import Notification

    try:
        n = Notification.objects.select_related("recipient").get(pk=notification_id)
    except Notification.DoesNotExist:
        return
    u = n.recipient
    if not u.email:
        return
    send_mail(
        subject=n.title,
        message=f"{n.message}\n\n{settings.FRONTEND_URL.rstrip('/')}{n.link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[u.email],
        fail_silently=True,
    )

from datetime import timedelta, timezone as dt_timezone

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone


def _ics_bytes(consultation) -> bytes:
    """Minimal iCalendar VEVENT (UTC)."""
    uid = f"consultation-{consultation.id}@justia"
    dtstart = consultation.scheduled_at.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    end = consultation.scheduled_at + timedelta(minutes=consultation.duration)
    dtend = end.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//JUSTIA//Consultation//FR",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{timezone.now().astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{dtstart}",
        f"DTEND:{dtend}",
        f"SUMMARY:Consultation JUSTIA — {consultation.get_consultation_type_display()}",
        f"DESCRIPTION:Demande liée (réf. demande).",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return ("\r\n".join(lines)).encode("utf-8")


@shared_task
def send_consultation_confirmation_email(consultation_id: str) -> None:
    from .models import Consultation

    try:
        c = Consultation.objects.select_related("client", "expert").get(pk=consultation_id)
    except Consultation.DoesNotExist:
        return
    EmailMessage(
        subject=f"Consultation planifiée — {c.scheduled_at.strftime('%d/%m/%Y %H:%M')}",
        body=(
            f"Bonjour {c.client.first_name},\n\n"
            f"Votre consultation avec {c.expert.full_name} est confirmée pour le "
            f"{timezone.localtime(c.scheduled_at).strftime('%d/%m/%Y à %H:%M')}.\n\n"
            "L’équipe JUSTIA"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[c.client.email],
    ).send(fail_silently=True)


@shared_task
def send_consultation_confirmation(consultation_id: str) -> None:
    """Compatibility wrapper: confirmation + calendar invite."""
    send_consultation_confirmation_email(consultation_id)
    send_consultation_calendar_invite(consultation_id)


@shared_task
def send_consultation_calendar_invite(consultation_id: str) -> None:
    from .models import Consultation

    try:
        c = Consultation.objects.select_related("client").get(pk=consultation_id)
    except Consultation.DoesNotExist:
        return
    email = EmailMessage(
        subject="Invitation calendrier — JUSTIA",
        body="Veuillez trouver ci-joint l’invitation au format iCalendar (.ics).",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[c.client.email],
    )
    email.attach("consultation.ics", _ics_bytes(c), "text/calendar")
    email.send(fail_silently=True)


@shared_task
def send_consultation_reminder(consultation_id: str, expected_scheduled_at_iso: str) -> None:
    from .models import Consultation

    try:
        c = Consultation.objects.select_related("client").get(pk=consultation_id)
    except Consultation.DoesNotExist:
        return
    if c.status in ("annulee", "reportee"):
        return
    if c.scheduled_at.isoformat() != expected_scheduled_at_iso:
        return
    EmailMessage(
        subject="Rappel : consultation demain — JUSTIA",
        body=(
            f"Bonjour {c.client.first_name},\n\n"
            f"Rappel : votre consultation est prévue le "
            f"{timezone.localtime(c.scheduled_at).strftime('%d/%m/%Y à %H:%M')}.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[c.client.email],
    ).send(fail_silently=True)


def schedule_consultation_reminder(consultation_id: str, scheduled_at_iso: str) -> None:
    """Schedule Celery task ~24h before start (uses ETA, no beat table required)."""
    from .models import Consultation

    try:
        c = Consultation.objects.get(pk=consultation_id)
    except Consultation.DoesNotExist:
        return
    eta = c.scheduled_at - timedelta(hours=24)
    if eta <= timezone.now():
        return
    send_consultation_reminder.apply_async(
        args=[consultation_id, scheduled_at_iso],
        eta=eta,
    )


def _send_meeting_reminder_email(c, hours_before: int) -> None:
    subject = (
        "Rappel : consultation demain — JUSTIA"
        if hours_before == 24
        else "Rappel : consultation dans 1 heure — JUSTIA"
    )
    quand = "demain" if hours_before == 24 else "dans 1 heure"
    meeting_link = f"\n🔗 Lien de réunion : {c.meeting_url}" if c.meeting_url else ""
    
    # ✅ Email client
    if c.client and c.client.email:
        EmailMessage(
            subject=subject,
            body=(
                f"Bonjour {c.client.first_name},\n\n"
                f"Rappel : votre consultation est prévue {quand}, le "
                f"{timezone.localtime(c.scheduled_at).strftime('%d/%m/%Y à %H:%M')} "
                f"({c.duration} min).\n"
                f"Expert : {c.expert.full_name if c.expert else '—'}\n"
                f"{meeting_link}\n\n"
                "L'équipe JUSTIA"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[c.client.email],
        ).send(fail_silently=True)

    # ✅ Email expert
    if c.expert and c.expert.email:
        EmailMessage(
            subject=subject,
            body=(
                f"Bonjour {c.expert.first_name},\n\n"
                f"Rappel : vous avez une consultation prévue {quand}, le "
                f"{timezone.localtime(c.scheduled_at).strftime('%d/%m/%Y à %H:%M')} "
                f"({c.duration} min).\n"
                f"Client : {c.client.full_name if c.client else '—'}\n"
                f"{meeting_link}\n\n"
                "L'équipe JUSTIA"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[c.expert.email],
        ).send(fail_silently=True)

@shared_task
def send_meeting_reminders() -> None:
    """Hourly task that sends 24h and 1h meeting reminders."""
    from .models import Consultation

    now = timezone.now()
    windows = ((24, now + timedelta(hours=24), now + timedelta(hours=25)),
               (1, now + timedelta(hours=1), now + timedelta(hours=2)))
    for hours_before, start_at, end_at in windows:
        consultations = Consultation.objects.select_related("client", "expert").filter(
            status__in=("planifiee", "confirmee"),
            scheduled_at__gte=start_at,
            scheduled_at__lt=end_at,
        )
        for c in consultations:
            _send_meeting_reminder_email(c, hours_before)


@shared_task
def notify_consultation_cancelled(consultation_id: str) -> None:
    from .models import Consultation

    try:
        c = Consultation.objects.select_related("client", "expert").get(pk=consultation_id)
    except Consultation.DoesNotExist:
        return
    body = f"La consultation du {timezone.localtime(c.scheduled_at).strftime('%d/%m/%Y %H:%M')} a été annulée.\nMotif : {c.cancel_reason or '—'}"
    if c.client.email:
        EmailMessage(
            subject="Consultation annulée — JUSTIA",
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[c.client.email],
        ).send(fail_silently=True)
    if c.expert.email:
        EmailMessage(
            subject="Consultation annulée — JUSTIA",
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[c.expert.email],
        ).send(fail_silently=True)


@shared_task
def notify_consultation_rescheduled(consultation_id: str) -> None:
    from .models import Consultation

    try:
        c = Consultation.objects.select_related("client").get(pk=consultation_id)
    except Consultation.DoesNotExist:
        return
    EmailMessage(
        subject="Consultation déplacée — JUSTIA",
        body=(
            f"Bonjour {c.client.first_name},\n\n"
            f"Nouveau créneau : {timezone.localtime(c.scheduled_at).strftime('%d/%m/%Y à %H:%M')}.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[c.client.email],
    ).send(fail_silently=True)


@shared_task
def notify_consultation_report_ready(consultation_id: str) -> None:
    from .models import Consultation

    try:
        c = Consultation.objects.select_related("client").get(pk=consultation_id)
    except Consultation.DoesNotExist:
        return
    EmailMessage(
        subject="Votre compte-rendu est disponible — JUSTIA",
        body="Votre compte-rendu de consultation est disponible dans votre espace.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[c.client.email],
    ).send(fail_silently=True)


@shared_task
def send_consultation_report_ready(consultation_id: str) -> None:
    notify_consultation_report_ready(consultation_id)

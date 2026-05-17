"""Celery tasks for publications (newsletter)."""

from celery import shared_task
from django.conf import settings


def enqueue_publications_task(task, *args):
    """Queue with Celery when a broker is used; run inline for eager / memory broker (local dev)."""
    from config.celery import app as celery_app

    broker = celery_app.conf.broker_url or ""
    if celery_app.conf.task_always_eager or broker.startswith("memory"):
        return task.apply(args=args)
    return task.delay(*args)


@shared_task
def send_newsletter(publication_id: str) -> None:
    """Notify subscribers when a publication is sent as newsletter (placeholder hook)."""
    # Hook: plug email campaign / SendGrid here.
    if settings.DEBUG:
        pass


@shared_task
def send_subscriber_confirmation(subscriber_id: str) -> None:
    """Send double opt-in confirmation (placeholder hook)."""
    if settings.DEBUG:
        pass

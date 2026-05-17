import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("justia")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "send-meeting-reminders": {
        "task": "apps.consultations.tasks.send_meeting_reminders",
        "schedule": crontab(minute=0),
    },
    "check-overdue-invoices": {
        "task": "apps.invoices.tasks.check_overdue_invoices",
        "schedule": crontab(hour=9, minute=0),
    },
    "check-overdue-demandes": {
        "task": "apps.demandes.tasks.check_overdue_demandes",
        "schedule": crontab(hour=8, minute=0),
    },
}

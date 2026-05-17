import datetime as dt
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.demandes.models import Demande
from apps.invoices.models import Invoice
from apps.notifications.models import Notification


@pytest.fixture(autouse=True)
def _celery_eager(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.CELERY_BROKER_URL = "memory://"
    settings.CELERY_RESULT_BACKEND = "cache+memory://"
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "test-cache",
        }
    }
    settings.CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def client_user(db):
    return User.objects.create_user(
        email="client@test.com",
        password="testpass123",
        first_name="Jean",
        last_name="Client",
        role="client",
        is_verified=True,
    )


@pytest.fixture
def expert_user(db):
    return User.objects.create_user(
        email="expert@justia.ma",
        password="testpass123",
        first_name="Me.",
        last_name="Expert",
        role="fournisseur",
        is_verified=True,
    )


@pytest.fixture
def other_client_user(db):
    return User.objects.create_user(
        email="other@test.com",
        password="testpass123",
        first_name="Other",
        last_name="Client",
        role="client",
        is_verified=True,
    )


@pytest.fixture
def auth_client(api_client, client_user):
    api_client.force_authenticate(user=client_user)
    return api_client


@pytest.fixture
def auth_expert(api_client, expert_user):
    api_client.force_authenticate(user=expert_user)
    return api_client


@pytest.fixture
def demande(client_user):
    return Demande.objects.create(
        client=client_user,
        domain="rgpd",
        description="Besoin de conseil RGPD",
        urgency="normale",
        status="en_attente",
    )


@pytest.fixture
def other_demande(other_client_user):
    return Demande.objects.create(
        client=other_client_user,
        domain="droit_affaires",
        description="Autre dossier",
        urgency="normale",
        status="en_attente",
    )


@pytest.fixture
def notification(client_user):
    return Notification.objects.create(
        recipient=client_user,
        type="systeme",
        title="Test",
        message="Message test",
    )


@pytest.fixture
def invoice(client_user, expert_user):
    return Invoice.objects.create(
        client=client_user,
        created_by=expert_user,
        status="en_attente",
        currency="MAD",
        subtotal=Decimal("100.00"),
        tax_rate=Decimal("20.00"),
        tax_amount=Decimal("0.00"),
        total=Decimal("0.00"),
        due_date=timezone.now().date() + dt.timedelta(days=5),
        notes="Facture test",
    )

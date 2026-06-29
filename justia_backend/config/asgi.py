import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# ← DOIT être en premier, avant tout import Django
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()

# ← Seulement après
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path

from apps.notifications.consumers import NotificationConsumer
from apps.notifications.middleware import JwtAuthMiddlewareStack

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JwtAuthMiddlewareStack(
            URLRouter([
                path("ws/notifications/", NotificationConsumer.as_asgi()),
            ])
        )
    ),
})
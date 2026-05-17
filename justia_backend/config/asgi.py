import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

from config.routing import application as websocket_application

django_asgi_app = get_asgi_application()

application = websocket_application
application.application_mapping["http"] = django_asgi_app

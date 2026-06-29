import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


@database_sync_to_async
def _get_user_from_jwt(token: str):
    try:
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import AccessToken

        User = get_user_model()
        decoded = AccessToken(token)
        uid = decoded["user_id"]
        user = User.objects.get(pk=uid)
        logger.info(f"JWT OK — user={user.email} role={user.role}")
        return user
    except Exception as e:
        logger.error(f"JWT ERREUR — {type(e).__name__}: {e}")
        return None


class JwtAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "websocket":
            return await self.inner(scope, receive, send)

        scope["user"] = AnonymousUser()
        qs = parse_qs(scope.get("query_string", b"").decode())
        token = (qs.get("token") or [None])[0]

        if token:
            user = await _get_user_from_jwt(token)
            if user is not None:
                scope["user"] = user

        return await self.inner(scope, receive, send)


# ← C'est cette ligne qui manquait
def JwtAuthMiddlewareStack(inner):
    return JwtAuthMiddleware(inner)
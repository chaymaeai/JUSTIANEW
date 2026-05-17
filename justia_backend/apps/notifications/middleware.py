from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _get_user_from_jwt(token: str):
    try:
        from django.contrib.auth import get_user_model

        from rest_framework_simplejwt.tokens import AccessToken

        User = get_user_model()
        decoded = AccessToken(token)
        uid = decoded["user_id"]
        return User.objects.get(pk=uid)
    except Exception:
        return None


class JwtAuthMiddleware:
    """Authenticate WebSocket connections via ?token=<JWT>."""

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

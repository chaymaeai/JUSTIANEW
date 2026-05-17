from django.conf import settings
from django.db.models import Count
from django.http import HttpResponseRedirect
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import EmailVerificationToken, PasswordResetToken, User
from .serializers import (
    ChangePasswordSerializer,
    ConfirmPasswordResetSerializer,
    CreateExpertSerializer,
    ExpertListSerializer,
    LoginSerializer,
    NotificationPreferencesSerializer,
    RegisterSerializer,
    RequestPasswordResetSerializer,
    StaffClientListSerializer,
    StaffLoginSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .tasks import (
    notify_staff_new_client_task,
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)
from apps.core.permissions import IsAdminOnly, IsExpertOrAdmin


def blacklist_all_user_tokens(user: User) -> None:
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    for outstanding in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=outstanding)


# ── Inscription client ─────────────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class RegisterView(CreateAPIView):
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ✅ Vérification automatique
        user.is_verified = True
        user.save(update_fields=["is_verified"])

        ev = EmailVerificationToken.objects.create(user=user)
        send_verification_email(str(user.id), str(ev.token))
        return Response(
            {
                "user":   UserSerializer(user).data,
                "detail": "Compte créé. Vérifiez votre email pour vous connecter.",
            },
            status=status.HTTP_201_CREATED,
        )

# ── Login client ───────────────────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class LoginView(TokenObtainPairView):
    serializer_class   = LoginSerializer
    permission_classes = [AllowAny]


# ── Login staff (expert + admin) ───────────────────────────────────────────────

@extend_schema(tags=["auth"])
class StaffLoginView(TokenObtainPairView):
    """
    Point d'entrée réservé aux experts et administrateurs.
    Un client qui tente de se connecter ici reçoit un 401.
    """
    serializer_class   = StaffLoginSerializer
    permission_classes = [AllowAny]


# ── Logout ─────────────────────────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {"detail": "Le champ « refresh » est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except TokenError:
            return Response(
                {"detail": "Jeton de rafraîchissement invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_200_OK)


# ── Profil utilisateur connecté ────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class MeView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


# ── Changement de mot de passe ─────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save()
        blacklist_all_user_tokens(request.user)
        return Response(status=status.HTTP_200_OK)


# ── Reset mot de passe ─────────────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class RequestPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = RequestPasswordResetSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"].lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(status=status.HTTP_200_OK)
        pr = PasswordResetToken.objects.create(user=user)
        send_password_reset_email(str(user.id), str(pr.token))
        return Response(status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class ConfirmPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = ConfirmPasswordResetSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pr   = ser.validated_data["password_reset_token"]
        user = pr.user
        user.set_password(ser.validated_data["new_password"])
        user.save(update_fields=["password"])
        pr.used = True
        pr.save(update_fields=["used"])
        blacklist_all_user_tokens(user)
        return Response(status=status.HTTP_200_OK)


# ── Préférences notifications ──────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class NotificationPreferencesView(RetrieveUpdateAPIView):
    serializer_class   = NotificationPreferencesSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


# ── Vérification email ─────────────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        ok  = f"{settings.FRONTEND_URL.rstrip('/')}/auth?verified=true"
        bad = f"{settings.FRONTEND_URL.rstrip('/')}/auth?verified=false"
        try:
            ev = EmailVerificationToken.objects.select_related("user").get(token=token)
        except EmailVerificationToken.DoesNotExist:
            return HttpResponseRedirect(bad)
        user             = ev.user
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        EmailVerificationToken.objects.filter(user=user).delete()
        send_welcome_email(str(user.id))
        if user.role == "client":
            try:
                notify_staff_new_client_task(str(user.id))
            except Exception:
                import logging
                logging.getLogger(__name__).exception("Could not queue notify_staff_new_client_task")
        return HttpResponseRedirect(ok)


# ── Vues staff : liste clients ─────────────────────────────────────────────────

@extend_schema(tags=["auth"])
class StaffClientListView(ListAPIView):
    permission_classes = [IsAuthenticated, IsExpertOrAdmin]
    serializer_class   = StaffClientListSerializer
    pagination_class   = None

    def get_queryset(self):
        return (
            User.objects.filter(role="client", is_active=True, is_verified=True)
            .annotate(demandes_count=Count("demandes", distinct=True))
            .order_by("-created_at")
        )


@extend_schema(tags=["auth"])
class StaffClientDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsExpertOrAdmin]
    serializer_class   = StaffClientListSerializer
    lookup_field       = "pk"

    def get_queryset(self):
        return User.objects.filter(role="client", is_active=True, is_verified=True).annotate(
            demandes_count=Count("demandes", distinct=True)
        )


# ── Vues admin : gestion experts ───────────────────────────────────────────────

@extend_schema(tags=["auth"])
class CreateExpertView(CreateAPIView):
    """Création d'un expert par un administrateur."""
    serializer_class   = CreateExpertSerializer
    permission_classes = [IsAuthenticated, IsAdminOnly]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        expert = serializer.save()
        return Response(
            {
                "user":   UserSerializer(expert).data,
                "detail": f"Expert {expert.email} créé avec succès.",
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"])
class ExpertListView(ListAPIView):
    """Liste de tous les experts — accessible aux admins uniquement."""
    serializer_class   = ExpertListSerializer
    permission_classes = [IsAuthenticated, IsAdminOnly]
    pagination_class   = None
    queryset           = User.objects.filter(role="expert").order_by("-created_at")
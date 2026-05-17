from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import PasswordResetToken, User


class StaffClientListSerializer(serializers.ModelSerializer):
    full_name      = serializers.ReadOnlyField()
    demandes_count = serializers.IntegerField(read_only=True)

    class Meta:
        model  = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "company", "is_verified", "created_at", "demandes_count",
        )


class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = (
            "email", "password", "password_confirm",
            "first_name", "last_name", "phone",
            "company", "role", "profile_type", "raison_sociale",
        )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value.lower()

    def validate_role(self, value):
        if value not in ("client",):
            raise serializers.ValidationError(
                "L'inscription publique est réservée aux clients."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )
        validate_password(attrs["password"])

        profile_type = attrs.get("profile_type", "physique")

        if profile_type == "morale":
            if not attrs.get("raison_sociale", "").strip():
                raise serializers.ValidationError(
                    {"raison_sociale": "La raison sociale est obligatoire pour une personne morale."}
                )

        if profile_type == "physique":
            if not attrs.get("first_name", "").strip():
                raise serializers.ValidationError(
                    {"first_name": "Le prénom est obligatoire pour une personne physique."}
                )
            if not attrs.get("last_name", "").strip():
                raise serializers.ValidationError(
                    {"last_name": "Le nom est obligatoire pour une personne physique."}
                )

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user     = User.objects.create_user(password=password, **validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "company", "role", "avatar", "is_verified",
            "created_at", "notif_email_demande", "notif_email_rdv",
            "notif_sms_rdv", "notif_email_facture",
            "profile_type", "raison_sociale", "speciality",
        )
        read_only_fields = ("id", "email", "role", "is_verified", "created_at")


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ("first_name", "last_name", "phone", "company", "avatar")
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name":  {"required": False},
            "phone":      {"required": False},
            "company":    {"required": False},
            "avatar":     {"required": False},
        }


class LoginSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not user.is_active:
            raise AuthenticationFailed("Ce compte est désactivé.", code="user_inactive")
        if not user.is_verified:
            raise AuthenticationFailed(
                "Compte non vérifié. Veuillez confirmer votre email.",
                code="email_not_verified",
            )
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        data["user"] = UserSerializer(user).data
        return data


class StaffLoginSerializer(TokenObtainPairSerializer):
    """Serializer de login réservé aux rôles expert et admin."""
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not user.is_active:
            raise AuthenticationFailed("Ce compte est désactivé.", code="user_inactive")
        if user.role == "client":
            raise AuthenticationFailed(
                "Accès réservé aux administrateurs et experts.",
                code="client_not_allowed",
            )
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        data["user"] = UserSerializer(user).data
        return data


class CreateExpertSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = (
            "email", "password", "first_name", "last_name",
            "phone", "speciality",
        )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value.lower()

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(
            password=password,
            role="expert",
            is_verified=True,
            is_staff=True,
            **validated_data,
        )


class ChangePasswordSerializer(serializers.Serializer):
    old_password         = serializers.CharField(write_only=True)
    new_password         = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Les mots de passe ne correspondent pas."}
            )
        validate_password(attrs["new_password"], self.context["request"].user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = (
            "notif_email_demande", "notif_email_rdv",
            "notif_sms_rdv", "notif_email_facture",
        )


class RequestPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ConfirmPasswordResetSerializer(serializers.Serializer):
    token                = serializers.UUIDField()
    new_password         = serializers.CharField(min_length=8)
    new_password_confirm = serializers.CharField()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Les mots de passe ne correspondent pas."}
            )
        try:
            pr = PasswordResetToken.objects.select_related("user").get(token=attrs["token"])
        except PasswordResetToken.DoesNotExist:
            raise ValidationError({"token": "Jeton invalide ou expiré."})
        if not pr.is_valid():
            raise ValidationError({"token": "Jeton invalide ou expiré."})
        validate_password(attrs["new_password"], pr.user)
        attrs["password_reset_token"] = pr
        return attrs


class ExpertListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "speciality", "is_active", "created_at",
        )
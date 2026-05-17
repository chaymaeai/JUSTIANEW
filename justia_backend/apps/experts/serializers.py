from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail

from .models import ExpertProfile

User = get_user_model()


class ExpertProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertProfile
        fields = (
            "id",
            "specializations",
            "bio",
            "years_experience",
            "bar_number",
            "languages",
            "max_concurrent_cases",
            "is_available",
            "rating_avg",
            "rating_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "rating_avg", "rating_count", "created_at", "updated_at")


class ExpertPublicSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ExpertProfile
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "specializations",
            "bio",
            "years_experience",
            "languages",
            "rating_avg",
            "rating_count",
            "is_available",
        )


class AdminCreateExpertSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    specializations = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    bio = serializers.CharField(required=False, allow_blank=True, default="")
    years_experience = serializers.IntegerField(required=False, min_value=0, default=0)
    bar_number = serializers.CharField(required=False, allow_blank=True, default="")
    languages = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    max_concurrent_cases = serializers.IntegerField(required=False, min_value=1, default=10)
    is_available = serializers.BooleanField(required=False, default=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe deja.")
        return value.lower()

    def create(self, validated_data):
        raw_password = validated_data.pop("password")
        profile_data = {
            "specializations": validated_data.pop("specializations", []),
            "bio": validated_data.pop("bio", ""),
            "years_experience": validated_data.pop("years_experience", 0),
            "bar_number": validated_data.pop("bar_number", ""),
            "languages": validated_data.pop("languages", []),
            "max_concurrent_cases": validated_data.pop("max_concurrent_cases", 10),
            "is_available": validated_data.pop("is_available", True),
        }
        user = User.objects.create_user(
            email=validated_data["email"],
            password=raw_password,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            phone=validated_data.get("phone", ""),
            company=validated_data.get("company", ""),
            role="expert",
            is_verified=True,
            is_active=True,
        )
        profile = ExpertProfile.objects.create(user=user, **profile_data)
        # ✅ Envoi email avec identifiants
        send_mail(
            subject="Bienvenue sur Justia — Vos identifiants",
            message=f"""Bonjour {user.first_name} {user.last_name},

Votre compte expert a été créé sur la plateforme Justia.

Vos identifiants de connexion :
- Email : {user.email}
- Mot de passe : {raw_password}

Veuillez vous connecter et changer votre mot de passe dès que possible.

Cordialement,
L'équipe Justia""",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return profile


class AdminExpertSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name", required=False)
    last_name = serializers.CharField(source="user.last_name", required=False)
    email = serializers.EmailField(source="user.email", read_only=False)
    is_active = serializers.BooleanField(source="user.is_active", required=False)
    phone = serializers.CharField(source="user.phone", required=False)
    speciality = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ExpertProfile
        fields = (
            "id",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_available",
            "phone", 
            "speciality",
            "specializations",
            "bio",
            "years_experience",
            "languages",
            "rating_avg",
            "rating_count",
            "created_at",
        )
        read_only_fields = ("id", "email", "rating_avg", "rating_count", "created_at")

    def get_speciality(self, obj):
        if obj.specializations:
            if isinstance(obj.specializations, list):
                return ", ".join(obj.specializations) if obj.specializations else ""
            return str(obj.specializations)
        return ""
    
    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exclude(
            expert_profile=self.instance
        ).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value

    def to_internal_value(self, data):
        if "speciality" in data and "specializations" not in data:
            speciality_str = data.get("speciality", "").strip()
            if speciality_str:
                data["specializations"] = [s.strip() for s in speciality_str.split(",") if s.strip()]
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        
        if user_data:
            user = instance.user
            if "first_name" in user_data:
                user.first_name = user_data["first_name"]
            if "last_name" in user_data:
                user.last_name = user_data["last_name"]
            if "is_active" in user_data:
                user.is_active = user_data["is_active"]
            if "email" in user_data:  # ✅ ajoute cette ligne
                user.email = user_data["email"].lower()  # ✅ et celle-ci
            if "phone" in user_data:
                user.phone = user_data["phone"]
            user.save()
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance

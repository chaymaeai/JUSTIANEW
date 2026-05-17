from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "owner",
            "demande",
            "consultation",
            "name",
            "file",
            "file_type",
            "mime_type",
            "size",
            "is_private",
            "file_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "owner",
            "mime_type",
            "size",
            "created_at",
            "updated_at",
        )

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        url = obj.file.url
        if request:
            return request.build_absolute_uri(url)
        return url


class DocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = (
            "demande",
            "consultation",
            "name",
            "file",
            "file_type",
            "is_private",
        )
        extra_kwargs = {
            "demande": {"required": False, "allow_null": True},
            "consultation": {"required": False, "allow_null": True},
            "file_type": {"required": False, "default": "autre"},
            "is_private": {"required": False, "default": False},
        }

    ALLOWED_EXT = {"pdf", "docx", "doc", "jpg", "jpeg", "png", "xlsx"}
    MAX_BYTES = 20 * 1024 * 1024

    def validate_file(self, f):
        if f.size > self.MAX_BYTES:
            raise serializers.ValidationError("Fichier trop volumineux (max 20 Mo).")
        name = getattr(f, "name", "") or ""
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
        if ext not in self.ALLOWED_EXT:
            raise serializers.ValidationError(
                f"Type non autorisé. Extensions : {', '.join(sorted(self.ALLOWED_EXT))}."
            )
        return f

    def validate(self, attrs):
        demande = attrs.get("demande")
        user = self.context["request"].user
        role = getattr(user, "role", None)
        if not demande:
            return attrs
        if role == "client" and demande.client_id != user.id:
            raise serializers.ValidationError(
                {"demande": "Cette demande ne vous appartient pas."}
            )
        if role == ("fournisseur", "expert") and demande.assigned_to_id != user.id:
            raise serializers.ValidationError(
                {"demande": "Vous n’êtes pas assigné à cette demande."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        f = validated_data["file"]
        validated_data["size"] = f.size
        validated_data["mime_type"] = getattr(
            f, "content_type", None
        ) or "application/octet-stream"
        doc = Document.objects.create(**validated_data)
        return doc

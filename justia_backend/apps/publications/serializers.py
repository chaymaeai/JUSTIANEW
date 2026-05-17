from django.utils.html import strip_tags
from rest_framework import serializers

from apps.authentication.serializers import UserSerializer

from .models import Category, Comment, NewsletterSubscriber, Publication, Tag


class NullablePrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """Treat empty string as null (multipart forms send '' for cleared selects)."""

    def to_internal_value(self, data):
        if data in ("", None):
            if not self.allow_null:
                self.fail("null")
            return None
        return super().to_internal_value(data)


class CategorySerializer(serializers.ModelSerializer):
    publications_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "color",
            "icon",
            "publications_count",
        )


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name", "slug")


class CommentSerializer(serializers.ModelSerializer):
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ("id", "author_name", "content", "created_at", "status", "replies")

    def get_replies(self, obj):
        qs = obj.replies.filter(status="approuve").order_by("created_at")
        return CommentSerializer(qs, many=True).data


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ("publication", "author_name", "author_email", "content", "parent")


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ("email", "first_name", "language")


class PublicationListSerializer(serializers.ModelSerializer):
    pub_type_display = serializers.CharField(source="get_pub_type_display", read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    has_pdf = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Publication
        fields = [
            "id",
            "title",
            "slug",
            "subtitle",
            "excerpt",
            "pub_type",
            "pub_type_display",
            "category",
            "tags",
            "author",
            "author_name",
            "author_bio",
            "cover_image",
            "cover_alt",
            "language",
            "status",
            "access",
            "is_featured",
            "has_pdf",
            "published_at",
            "reading_time",
            "views_count",
            "comments_count",
        ]

    def get_author_name(self, obj):
        if obj.author_name:
            return obj.author_name
        if obj.author_id:
            return obj.author.full_name
        return "JUSTIA"

    def get_cover_image(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.cover_image.url)
        return obj.cover_image.url

    def get_has_pdf(self, obj):
        return bool(obj.pdf_file)

    def get_comments_count(self, obj):
        return obj.comments.filter(status="approuve").count()


class PublicationDetailSerializer(PublicationListSerializer):
    author = UserSerializer(read_only=True)
    comments = serializers.SerializerMethodField()
    related_publications = PublicationListSerializer(many=True, read_only=True)

    class Meta(PublicationListSerializer.Meta):
        fields = PublicationListSerializer.Meta.fields + [
            "content",
            "meta_title",
            "meta_description",
            "canonical_url",
            "shares_count",
            "related_publications",
            "comments",
        ]

    def get_comments(self, obj):
        top = obj.comments.filter(status="approuve", parent=None).prefetch_related("replies")
        return CommentSerializer(top, many=True).data


class PublicationCreateUpdateSerializer(serializers.ModelSerializer):
    category = NullablePrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Publication
        extra_kwargs = {
            "author": {"required": False, "allow_null": True},
            "slug": {"read_only": True},
        }
        fields = [
            "slug",
            "title",
            "subtitle",
            "excerpt",
            "content",
            "pub_type",
            "category",
            "tags",
            "language",
            "author",
            "author_name",
            "author_bio",
            "cover_image",
            "cover_alt",
            "pdf_file",
            "status",
            "access",
            "is_featured",
            "is_newsletter",
            "scheduled_at",
            "meta_title",
            "meta_description",
            "canonical_url",
            "related_publications",
        ]

    def validate(self, data):
        status = data.get("status", getattr(self.instance, "status", None) if self.instance else "brouillon")
        if not status:
            status = "brouillon"
        content = data.get("content", getattr(self.instance, "content", "") if self.instance else "")
        if status not in ("brouillon", "revision") and not strip_tags(str(content or "")).strip():
            raise serializers.ValidationError(
                {"content": "Le contenu est requis pour publier."}
            )
        return data

    def validate_scheduled_at(self, value):
        from django.utils import timezone

        if value and value <= timezone.now():
            raise serializers.ValidationError("La date de planification doit être dans le futur.")
        return value

import uuid
from datetime import date

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Count, F, Q, Sum
from django.utils.html import strip_tags
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.permissions import IsAdmin, IsFournisseurOrAdmin

from .filters import PublicationFilter
from .models import Category, Comment, NewsletterSubscriber, Publication
from .serializers import (
    CategorySerializer,
    CommentCreateSerializer,
    CommentSerializer,
    NewsletterSubscriberSerializer,
    PublicationCreateUpdateSerializer,
    PublicationDetailSerializer,
    PublicationListSerializer,
)


def _role(user):
    if not user.is_authenticated:
        return None
    return getattr(user, "role", None)


def _staff_publications(user):
    return user.is_authenticated and _role(user) in ("fournisseur", "admin")


def check_publication_access(request, pub: Publication) -> None:
    if pub.access == "public":
        return
    if not request.user.is_authenticated:
        raise PermissionDenied(detail="Authentification requise pour ce contenu.")
    if pub.access in ("members", "premium"):
        return


class PublicationViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PublicationFilter
    search_fields = ["title", "subtitle", "excerpt", "content"]
    ordering_fields = ["published_at", "views_count", "reading_time", "created_at", "updated_at"]
    ordering = ["-published_at"]

    def get_queryset(self):
        qs = Publication.objects.select_related("author", "category").prefetch_related(
            "tags", "related_publications"
        )
        user = self.request.user

        if self.action == "list":
            if _staff_publications(user):
                return qs
            qs = qs.filter(status="publie")
            qs = qs.filter(access__in=["public", "members"])
            return qs

        if _staff_publications(user):
            return qs
        return qs.filter(status="publie")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return PublicationCreateUpdateSerializer
        if self.action == "retrieve":
            return PublicationDetailSerializer
        return PublicationListSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "related", "pdf"]:
            return [AllowAny()]
        if self.action == "stats":
            return [IsAuthenticated(), IsFournisseurOrAdmin()]
        if self.action == "destroy":
            return [IsAuthenticated(), IsAdmin()]
        if self.action in [
            "create",
            "update",
            "partial_update",
            "publish",
            "archive",
            "featured",
            "upload_image",
        ]:
            return [IsAuthenticated(), IsFournisseurOrAdmin()]
        return [IsAuthenticated()]

    def get_object(self):
        obj = super().get_object()
        if self.action in ("retrieve", "pdf"):
            check_publication_access(self.request, obj)
        return obj

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.increment_views()
        instance.refresh_from_db(fields=["views_count"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        author = serializer.validated_data.get("author")
        if _role(user) != "admin":
            author = user
        elif author is None:
            author = user
        serializer.save(author=author)

    def perform_update(self, serializer):
        user = self.request.user
        pub = self.get_object()
        if _role(user) == "fournisseur" and pub.author_id != user.id:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres publications.")
        serializer.save()

    def perform_destroy(self, instance):
        """Admin-only (see get_permissions): permanent delete; comments CASCADE."""
        instance.delete()

    @action(
        detail=False,
        methods=["post"],
        url_path="upload-image",
    )
    def upload_image(self, request):
        """Staff-only: upload an image for use in publication HTML body (returns absolute URL)."""
        uploaded = request.FILES.get("image") or request.FILES.get("file")
        if not uploaded:
            return Response(
                {"detail": "Fichier manquant."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ctype = (getattr(uploaded, "content_type", None) or "").lower()
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if ctype not in allowed_types:
            return Response(
                {"detail": "Format non supporté (JPEG, PNG, WebP, GIF)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        max_bytes = 5 * 1024 * 1024
        if getattr(uploaded, "size", 0) and uploaded.size > max_bytes:
            return Response(
                {"detail": "Fichier trop volumineux (max 5 Mo)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
        ext = ext_map.get(ctype, "bin")
        name = f"publications/editor/{uuid.uuid4().hex}.{ext}"
        path = default_storage.save(name, uploaded)
        media_url = settings.MEDIA_URL.rstrip("/") + "/" + path.lstrip("/")
        url = request.build_absolute_uri(media_url)
        return Response({"url": url})

    @action(detail=True, methods=["post"])
    def publish(self, request, slug=None):
        pub = self.get_object()
        if not strip_tags(str(pub.content or "")).strip():
            return Response(
                {"error": "Le contenu est requis avant de publier."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pub.status = "publie"
        pub.published_at = timezone.now()
        pub.save()
        if pub.is_newsletter:
            from .tasks import enqueue_publications_task, send_newsletter

            enqueue_publications_task(send_newsletter, str(pub.id))
        return Response(
            PublicationListSerializer(pub, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, slug=None):
        pub = self.get_object()
        pub.status = "archive"
        pub.save(update_fields=["status", "updated_at"])
        return Response({"status": "archive"})

    @action(detail=True, methods=["post"])
    def featured(self, request, slug=None):
        pub = self.get_object()
        if not pub.is_featured:
            featured_count = Publication.objects.filter(
                is_featured=True, status="publie"
            ).count()
            if featured_count >= 6:
                return Response(
                    {"error": "Maximum 6 publications en featured."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        pub.is_featured = not pub.is_featured
        pub.save(update_fields=["is_featured", "updated_at"])
        return Response({"is_featured": pub.is_featured})

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def related(self, request, slug=None):
        pub = get_object_or_404(
            Publication.objects.select_related("category").prefetch_related("tags"),
            slug=slug,
        )
        if not _staff_publications(request.user) and pub.status != "publie":
            return Response(status=status.HTTP_404_NOT_FOUND)
        check_publication_access(request, pub)

        related = (
            Publication.objects.filter(status="publie", category=pub.category)
            .exclude(id=pub.id)
            .order_by("-published_at")[:4]
        )
        related_list = list(related)
        if len(related_list) < 4:
            need = 4 - len(related_list)
            tag_ids = pub.tags.values_list("id", flat=True)
            exclude_ids = {p.id for p in related_list} | {pub.id}
            extra = (
                Publication.objects.filter(status="publie", tags__in=tag_ids)
                .exclude(id__in=exclude_ids)
                .distinct()
                .order_by("-published_at")[:need]
            )
            related_list.extend(list(extra))

        serializer = PublicationListSerializer(
            related_list, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"], permission_classes=[AllowAny], url_path="pdf")
    def pdf(self, request, slug=None):
        pub = self.get_object()
        if not pub.pdf_file:
            return Response({"detail": "Aucun PDF."}, status=status.HTTP_404_NOT_FOUND)
        Publication.objects.filter(pk=pub.pk).update(shares_count=F("shares_count") + 1)
        file_handle = pub.pdf_file.open("rb")
        filename = pub.pdf_file.name.rsplit("/", 1)[-1]
        resp = FileResponse(
            file_handle, as_attachment=True, filename=filename or f"{pub.slug}.pdf"
        )
        return resp

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = Publication.objects.all()
        today = date.today()
        this_month = qs.filter(
            published_at__year=today.year,
            published_at__month=today.month,
            status="publie",
        ).count()

        return Response(
            {
                "total": qs.count(),
                "publie": qs.filter(status="publie").count(),
                "brouillon": qs.filter(status="brouillon").count(),
                "planifie": qs.filter(status="planifie").count(),
                "archive": qs.filter(status="archive").count(),
                "total_views": qs.aggregate(t=Sum("views_count"))["t"] or 0,
                "total_shares": qs.aggregate(t=Sum("shares_count"))["t"] or 0,
                "this_month": this_month,
                "by_type": list(
                    qs.filter(status="publie")
                    .values("pub_type")
                    .annotate(count=Count("id"), views=Sum("views_count"))
                    .order_by("-count")
                ),
                "by_category": list(
                    qs.filter(status="publie", category__isnull=False)
                    .values("category__name", "category__slug")
                    .annotate(count=Count("id"))
                    .order_by("-count")
                ),
                "by_language": list(
                    qs.filter(status="publie")
                    .values("language")
                    .annotate(count=Count("id"))
                ),
                "top_5": PublicationListSerializer(
                    qs.filter(status="publie").order_by("-views_count")[:5],
                    many=True,
                    context={"request": request},
                ).data,
            }
        )


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_active=True).annotate(
        publications_count=Count(
            "publications", filter=Q(publications__status="publie")
        )
    )
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return [AllowAny()]


class NewsletterSubscribeView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "newsletter"

    def post(self, request):
        serializer = NewsletterSubscriberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data["email"]
        sub, created = NewsletterSubscriber.objects.get_or_create(
            email=email.lower(),
            defaults={
                "first_name": serializer.validated_data.get("first_name", ""),
                "language": serializer.validated_data.get("language", "fr"),
            },
        )
        if not created and sub.is_active:
            return Response(
                {"message": "Vous êtes déjà abonné(e)."},
                status=status.HTTP_200_OK,
            )
        if not created:
            sub.is_active = True
            sub.first_name = serializer.validated_data.get("first_name", sub.first_name)
            sub.language = serializer.validated_data.get("language", sub.language)
            sub.save()
        from .tasks import enqueue_publications_task, send_subscriber_confirmation

        enqueue_publications_task(send_subscriber_confirmation, str(sub.id))
        return Response(
            {"message": "Vérifiez votre email pour confirmer votre abonnement."},
            status=status.HTTP_201_CREATED,
        )


class NewsletterConfirmView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        from django.shortcuts import redirect

        try:
            sub = NewsletterSubscriber.objects.get(confirm_token=token)
            sub.confirmed = True
            sub.save(update_fields=["confirmed"])
            base = settings.FRONTEND_URL.rstrip("/")
            return redirect(f"{base}/publications?subscribed=true")
        except NewsletterSubscriber.DoesNotExist:
            base = settings.FRONTEND_URL.rstrip("/")
            return redirect(f"{base}/publications?error=invalid-token")


class NewsletterUnsubscribeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        token = request.data.get("token")
        try:
            if email:
                sub = NewsletterSubscriber.objects.get(email__iexact=email.strip())
            else:
                sub = NewsletterSubscriber.objects.get(confirm_token=token)
        except (NewsletterSubscriber.DoesNotExist, TypeError, ValueError):
            return Response(
                {"error": "Email non trouvé."},
                status=status.HTTP_404_NOT_FOUND,
            )
        sub.is_active = False
        sub.unsubscribed_at = timezone.now()
        sub.save(update_fields=["is_active", "unsubscribed_at"])
        return Response({"message": "Désabonnement effectué."})


class CommentListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        pub = get_object_or_404(Publication, slug=slug)
        check_publication_access(request, pub)
        comments = pub.comments.filter(status="approuve", parent=None).prefetch_related(
            "replies"
        )
        return Response(CommentSerializer(comments, many=True).data)

    def post(self, request, slug):
        pub = get_object_or_404(Publication, slug=slug)
        check_publication_access(request, pub)
        serializer = CommentCreateSerializer(
            data={**request.data, "publication": str(pub.id)}
        )
        if serializer.is_valid():
            comment = serializer.save(
                ip_address=request.META.get("REMOTE_ADDR"),
                author=request.user if request.user.is_authenticated else None,
            )
            return Response(
                CommentSerializer(comment).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentModerateView(APIView):
    permission_classes = [IsAuthenticated, IsFournisseurOrAdmin]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        new_status = request.data.get("status")
        if new_status not in ("approuve", "rejete", "spam"):
            return Response(
                {"error": "Statut invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        comment.status = new_status
        comment.moderated_by = request.user
        comment.moderated_at = timezone.now()
        comment.save()
        return Response({"status": new_status})

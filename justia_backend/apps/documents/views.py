import logging

from django.db.models import Q, Sum
from django.http import FileResponse, Http404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from .filters import DocumentFilter
from .models import Document
from .serializers import DocumentCreateSerializer, DocumentSerializer
from .utils import get_presigned_or_media_url

logger = logging.getLogger(__name__)


def _demande_closed(demande) -> bool:
    return demande and demande.status in ("traitee", "annulee")


def _can_access_document(user, doc: Document) -> bool:
    role = getattr(user, "role", None)
    if role == "admin":
        return True
    if doc.owner_id == user.id:
        return True
    if role in ("fournisseur", "expert") and doc.demande_id and doc.demande.assigned_to_id == user.id:
        return True
    if (
        role == "client"
        and doc.demande_id
        and doc.demande.client_id == user.id
        and not doc.is_private
    ):
        return True
    return False


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = DocumentFilter
    search_fields = ("name",)
    ordering_fields = ("created_at", "name", "size")
    ordering = ("-created_at",)

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        qs = Document.objects.select_related(
            "owner", "demande", "demande__client", "demande__assigned_to", "consultation"
        )
        if role == "admin":
            return qs
        if role in ("fournisseur", "expert"):
            return qs.filter(
                Q(owner=user) | Q(demande__assigned_to=user)
            ).distinct()
        return qs.filter(
            Q(owner=user) | Q(demande__client=user, is_private=False)
        ).distinct()

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentCreateSerializer
        return DocumentSerializer

    def retrieve(self, request, *args, **kwargs):
        doc = self.get_object()
        if not _can_access_document(request.user, doc):
            raise PermissionDenied()
        ser = DocumentSerializer(doc, context={"request": request})
        data = ser.data
        data["download_url"] = get_presigned_or_media_url(request, doc, expires=300)
        return Response(data)

    def perform_create(self, serializer):
        doc = serializer.save(owner=self.request.user)
        if doc.demande_id and doc.demande.assigned_to_id:
            from apps.notifications.services import notify

            notify(
                doc.demande.assigned_to_id,
                "document_ajoute",
                "Nouveau document",
                f"{doc.name} a été ajouté sur la demande {doc.demande.reference}.",
                link=f"/espace-fournisseur/demandes/{doc.demande_id}",
                demande_id=doc.demande_id,
                document_id=doc.id,
            )

    def perform_destroy(self, instance):
        user = self.request.user
        role = getattr(user, "role", None)
        if role == "client":
            if instance.owner_id != user.id:
                raise PermissionDenied()
            if instance.demande_id and _demande_closed(instance.demande):
                raise PermissionDenied(
                    detail="Impossible de supprimer : la demande est clôturée."
                )
        elif role in ("fournisseur", "expert"):
            if not (
                instance.demande_id
                and instance.demande.assigned_to_id == user.id
            ) and instance.owner_id != user.id:
                raise PermissionDenied()
        elif role != "admin":
            raise PermissionDenied()
        if instance.file:
            instance.file.delete(save=False)
        instance.delete()

    @extend_schema(tags=["documents"])
    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        doc = self.get_object()
        if not _can_access_document(request.user, doc):
            raise PermissionDenied()
        logger.info(
            "document.download",
            extra={
                "document_id": str(doc.id),
                "user_id": str(request.user.id),
            },
        )
        url = get_presigned_or_media_url(request, doc, expires=300)
        if url and url.startswith("http"):
            return Response({"url": url, "expires_in": 300})
        if doc.file:
            try:
                doc.file.open("rb")
                resp = FileResponse(
                    doc.file,
                    as_attachment=True,
                    filename=doc.name or doc.file.name.split("/")[-1],
                )
                return resp
            except FileNotFoundError:
                raise Http404()
        raise Http404()


def _document_stats_queryset(user):
    role = getattr(user, "role", None)
    qs = Document.objects.all()
    if role == "client":
        qs = qs.filter(owner=user)
    elif role in ("fournisseur", "expert"):
        qs = qs.filter(
            Q(demande__assigned_to=user) | Q(owner=user)
        ).distinct()
    elif role != "admin":
        qs = Document.objects.none()
    return qs


@extend_schema(tags=["documents"])
class DocumentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _document_stats_queryset(request.user)
        total_count = qs.count()
        total_size = qs.aggregate(s=Sum("size"))["s"] or 0
        by_type = []
        for ft, label in Document.TYPE_CHOICES:
            sub = qs.filter(file_type=ft)
            c = sub.count()
            sz = sub.aggregate(s=Sum("size"))["s"] or 0
            by_type.append({"type": ft, "label": label, "count": c, "size": sz})
        return Response(
            {
                "total_count": total_count,
                "total_size": total_size,
                "by_type": by_type,
            }
        )
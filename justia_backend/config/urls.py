from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.invoices.payment_views import StripeWebhookView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("ckeditor/", include("ckeditor_uploader.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/demandes/", include("apps.demandes.urls")),
    path("api/consultations/", include("apps.consultations.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/invoices/", include("apps.invoices.urls")),
    path("api/experts/", include("apps.experts.urls")),
    path("api/core/", include("apps.core.urls")),
    path("api/publications/", include("apps.publications.urls")),
    path("api/rapports/", include("apps.rapports.urls")),

    # ── Stripe Webhook (hors JWT — AllowAny) ──────────────────
    path("api/payments/webhook/", StripeWebhookView.as_view()),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
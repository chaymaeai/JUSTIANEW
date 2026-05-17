from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InvoiceViewSet
from .payment_views import CreatePaymentSessionView

router = DefaultRouter()
router.register("", InvoiceViewSet, basename="invoice")

urlpatterns = [
    path("", include(router.urls)),
    path("<uuid:invoice_id>/create-payment-session/", CreatePaymentSessionView.as_view()),
]
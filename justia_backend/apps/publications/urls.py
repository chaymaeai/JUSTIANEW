from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
# Register concrete prefixes before publication slug routes so "categories" is not a publication slug.
router.register(r"categories", views.CategoryViewSet, basename="category")
router.register(r"", views.PublicationViewSet, basename="publication")

urlpatterns = [
    path('newsletter/subscribe/',       views.NewsletterSubscribeView.as_view()),
    path('newsletter/confirm/<uuid:token>/', views.NewsletterConfirmView.as_view()),
    path('newsletter/unsubscribe/',     views.NewsletterUnsubscribeView.as_view()),
    path('<slug:slug>/comments/',       views.CommentListCreateView.as_view()),
    path('comments/<uuid:pk>/moderate/',views.CommentModerateView.as_view()),
    path('', include(router.urls)),
]

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView,RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.core.permissions import IsAdmin, IsFournisseur

from .models import ExpertProfile
from .serializers import (
    AdminCreateExpertSerializer,
    ExpertProfileSerializer,
    ExpertPublicSerializer,
    AdminExpertSerializer,
)


@extend_schema(tags=["experts"])
class ExpertProfileMeView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsFournisseur]
    serializer_class = ExpertProfileSerializer

    def get_object(self):
        profile, _ = ExpertProfile.objects.get_or_create(user=self.request.user)
        return profile  # ✅ corrigé


@extend_schema(tags=["experts"])
class ExpertDirectoryListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ExpertPublicSerializer
    queryset = ExpertProfile.objects.select_related("user").filter(
        user__role="fournisseur",
        is_available=True,
    )


@extend_schema(tags=["experts"])
class AdminCreateExpertView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = AdminCreateExpertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(
            AdminExpertSerializer(profile, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["experts"])
class AdminExpertDetailView(RetrieveUpdateDestroyAPIView): 
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AdminExpertSerializer

    def get_object(self):
        return get_object_or_404(ExpertProfile, id=self.kwargs["pk"])  # ✅
    def perform_destroy(self, instance):
        # Supprime aussi le User lié
        instance.user.delete()  # ✅ supprime le user ET le profil


@extend_schema(tags=["experts"])
class AdminExpertListView(ListAPIView):  # ✅ classe manquante ajoutée
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AdminExpertSerializer
    queryset = ExpertProfile.objects.select_related("user").all()
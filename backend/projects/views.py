from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccessLog, Client, Project, ProjectAccessLink, ProjectStep, ProjectStatus
from .serializers import (
    ClientOptionSerializer,
    InternalProjectCreateUpdateSerializer,
    InternalProjectDetailSerializer,
    InternalProjectListSerializer,
    InternalProjectStepUpdateSerializer,
    InternalUserOptionSerializer,
    ProjectStepManageSerializer,
    PublicProjectSerializer,
)

User = get_user_model()

class PublicProjectDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, token):
        try:
            access_link = ProjectAccessLink.objects.select_related(
                "project",
                "project__client"
            ).get(
                token=token,
                is_active=True
            )
        except ProjectAccessLink.DoesNotExist:
            return Response(
                {"detail": "Lien invalide ou inactif."},
                status=status.HTTP_404_NOT_FOUND
            )

        if access_link.expires_at and access_link.expires_at < timezone.now():
            return Response(
                {"detail": "Ce lien a expiré."},
                status=status.HTTP_403_FORBIDDEN
            )

        AccessLog.objects.create(
            access_link=access_link,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")
        )

        serializer = PublicProjectSerializer(
            access_link.project,
            context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")

class ProjectStepCreateForProjectAPIView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectStepManageSerializer

    def perform_create(self, serializer):
        project = generics.get_object_or_404(Project, pk=self.kwargs["project_id"])
        serializer.save(project=project)

class DashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Project.objects.select_related(
            "client",
            "project_manager",
            "created_by"
        ).all()

        total_projects = queryset.count()
        draft_projects = queryset.filter(status=ProjectStatus.DRAFT).count()
        in_progress_projects = queryset.filter(status=ProjectStatus.IN_PROGRESS).count()
        completed_projects = queryset.filter(status=ProjectStatus.COMPLETED).count()
        delayed_projects = queryset.filter(status=ProjectStatus.DELAYED).count()
        blocked_projects = queryset.filter(status=ProjectStatus.BLOCKED).count()
        cancelled_projects = queryset.filter(status=ProjectStatus.CANCELLED).count()

        recent_projects = queryset.order_by("-created_at")[:5]
        attention_projects = queryset.filter(
            status__in=[ProjectStatus.DELAYED, ProjectStatus.BLOCKED]
        ).order_by("-updated_at")[:5]

        recent_projects_data = InternalProjectListSerializer(
            recent_projects,
            many=True
        ).data

        attention_projects_data = InternalProjectListSerializer(
            attention_projects,
            many=True
        ).data

        data = {
            "stats": {
                "total_projects": total_projects,
                "draft_projects": draft_projects,
                "in_progress_projects": in_progress_projects,
                "completed_projects": completed_projects,
                "delayed_projects": delayed_projects,
                "blocked_projects": blocked_projects,
                "cancelled_projects": cancelled_projects,
            },
            "recent_projects": recent_projects_data,
            "attention_projects": attention_projects_data,
        }

        return Response(data, status=status.HTTP_200_OK)

class ClientListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ClientOptionSerializer

    def get_queryset(self):
        return Client.objects.all().order_by("name")


class InternalUserListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InternalUserOptionSerializer

    def get_queryset(self):
        return User.objects.filter(is_staff=True).order_by("username")

class InternalProjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.select_related("client", "project_manager", "created_by").all()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return InternalProjectCreateUpdateSerializer
        return InternalProjectListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InternalProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.select_related(
            "client",
            "project_manager",
            "created_by"
        ).prefetch_related("steps")

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return InternalProjectCreateUpdateSerializer
        return InternalProjectDetailSerializer

class InternalProjectStepDetailUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = ProjectStep.objects.select_related("project")
    serializer_class = InternalProjectStepUpdateSerializer
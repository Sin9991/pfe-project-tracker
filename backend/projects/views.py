from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccessLog, Attachment, Client, Comment, Project, ProjectAccessLink, ProjectStep, ProjectStatus
from .serializers import (
    AttachmentVisibilityUpdateSerializer,
    ClientCreateUpdateSerializer,
    ClientListSerializer,
    InternalCommentUpdateSerializer,
    InternalProjectCreateUpdateSerializer,
    InternalProjectDetailSerializer,
    InternalProjectListSerializer,
    InternalProjectStepUpdateSerializer,
    InternalUserOptionSerializer,
    ProjectStepManageSerializer,
    PublicProjectSerializer,
    StepAttachmentCreateSerializer,
    StepCommentCreateSerializer,
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
        project.recalculate_progress_and_status()


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

        recent_projects_data = InternalProjectListSerializer(recent_projects, many=True).data
        attention_projects_data = InternalProjectListSerializer(attention_projects, many=True).data

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


class ClientListAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Client.objects.all().order_by("name")
        q = self.request.query_params.get("q", "").strip()

        if q:
            queryset = queryset.filter(
                Q(name__icontains=q)
                | Q(company__icontains=q)
                | Q(email__icontains=q)
                | Q(phone__icontains=q)
            )

        return queryset

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ClientCreateUpdateSerializer
        return ClientListSerializer


class ClientDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Client.objects.all().order_by("name")
    serializer_class = ClientCreateUpdateSerializer


class InternalUserListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InternalUserOptionSerializer

    def get_queryset(self):
        return User.objects.filter(is_staff=True).order_by("username")


class InternalProjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Project.objects.select_related(
            "client",
            "project_manager",
            "created_by"
        ).all()

        q = self.request.query_params.get("q", "").strip()
        status_filter = self.request.query_params.get("status", "").strip()
        client_filter = self.request.query_params.get("client", "").strip()
        manager_filter = self.request.query_params.get("manager", "").strip()
        ordering = self.request.query_params.get("ordering", "").strip()

        if q:
            queryset = queryset.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
                | Q(project_type__icontains=q)
                | Q(client__name__icontains=q)
                | Q(client__company__icontains=q)
            )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if client_filter:
            queryset = queryset.filter(client_id=client_filter)

        if manager_filter:
            queryset = queryset.filter(project_manager_id=manager_filter)

        ordering_map = {
            "newest": "-created_at",
            "oldest": "created_at",
            "title_asc": "title",
            "title_desc": "-title",
            "progress_asc": "progress_percentage",
            "progress_desc": "-progress_percentage",
            "expected_end_asc": "expected_end_date",
            "expected_end_desc": "-expected_end_date",
            "status_asc": "status",
            "status_desc": "-status",
        }

        queryset = queryset.order_by(ordering_map.get(ordering, "-created_at"))
        return queryset

    def get_serializer_class(self):
        if self.request.method == "GET":
            return InternalProjectListSerializer
        return InternalProjectCreateUpdateSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InternalProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.select_related(
            "client",
            "project_manager",
            "created_by"
        ).prefetch_related(
            "steps",
            "steps__comments__author",
            "steps__attachments",
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return InternalProjectCreateUpdateSerializer
        return InternalProjectDetailSerializer


class InternalProjectStepDetailUpdateView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InternalProjectStepUpdateSerializer
    queryset = ProjectStep.objects.select_related("project")

    def perform_update(self, serializer):
        step = serializer.save()
        step.project.recalculate_progress_and_status()

    def perform_destroy(self, instance):
        project = instance.project
        instance.delete()

        remaining_steps = project.steps.order_by("step_order")
        for index, step in enumerate(remaining_steps, start=1):
            if step.step_order != index:
                step.step_order = index
                step.save(update_fields=["step_order", "updated_at"])

        project.recalculate_progress_and_status()


class StepCommentCreateAPIView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StepCommentCreateSerializer

    def perform_create(self, serializer):
        step = generics.get_object_or_404(ProjectStep, pk=self.kwargs["step_id"])

        if step.project.status == ProjectStatus.CANCELLED:
            raise ValidationError({
                "detail": "Impossible d’ajouter un commentaire à un projet annulé."
            })

        serializer.save(step=step, author=self.request.user)


class CommentDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InternalCommentUpdateSerializer
    queryset = Comment.objects.select_related("author", "step", "step__project")


class StepAttachmentCreateAPIView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StepAttachmentCreateSerializer

    def perform_create(self, serializer):
        step = generics.get_object_or_404(ProjectStep, pk=self.kwargs["step_id"])

        if step.project.status == ProjectStatus.CANCELLED:
            raise ValidationError({
                "detail": "Impossible d’ajouter une pièce jointe à un projet annulé."
            })

        uploaded_file = self.request.FILES.get("file")
        serializer.save(
            step=step,
            file_name=uploaded_file.name if uploaded_file else "",
            file_type=getattr(uploaded_file, "content_type", "") or "",
        )


class AttachmentDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AttachmentVisibilityUpdateSerializer
    queryset = Attachment.objects.select_related("step", "step__project")
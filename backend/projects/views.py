from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccessLog, Attachment, Client, Comment, Project, ProjectAccessLink, ProjectStep, ProjectStatus, log_project_activity
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
        step = serializer.save(project=project)
        project.recalculate_progress_and_status()

        log_project_activity(
            project=project,
            action_type="step_created",
            message=f"Étape créée : {step.title}",
            user=self.request.user,
        )


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
        project = serializer.save(created_by=self.request.user)

        log_project_activity(
            project=project,
            action_type="project_created",
            message=f"Projet créé : {project.title}",
            user=self.request.user,
        )


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

    def get_queryset(self):
        return Project.objects.select_related(
            "client",
            "project_manager",
            "created_by"
        ).prefetch_related(
            "steps",
            "steps__comments__author",
            "steps__attachments",
            "activities__user",
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        old_title = instance.title

        project = serializer.save()

        if project.status == ProjectStatus.CANCELLED and old_status != ProjectStatus.CANCELLED:
            message = f"Projet annulé. Cause : {project.cancellation_reason or 'Non précisée'}"
            action_type = "project_cancelled"
        else:
            message = f"Projet mis à jour : {old_title}"
            action_type = "project_updated"

        log_project_activity(
            project=project,
            action_type=action_type,
            message=message,
            user=self.request.user,
        )

class InternalProjectStepDetailUpdateView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InternalProjectStepUpdateSerializer
    queryset = ProjectStep.objects.select_related("project")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        old_title = instance.title

        step = serializer.save()
        step.project.recalculate_progress_and_status()

        if old_status != step.status:
            message = (
                f"Étape modifiée : {old_title} "
                f"(statut : {old_status} → {step.status})"
            )
        else:
            message = f"Étape modifiée : {old_title}"

        log_project_activity(
            project=step.project,
            action_type="step_updated",
            message=message,
            user=self.request.user,
        )

    def perform_destroy(self, instance):
        project = instance.project
        step_title = instance.title

        instance.delete()

        remaining_steps = project.steps.order_by("step_order")
        for index, step in enumerate(remaining_steps, start=1):
            if step.step_order != index:
                step.step_order = index
                step.save(update_fields=["step_order", "updated_at"])

        project.recalculate_progress_and_status()

        log_project_activity(
            project=project,
            action_type="step_deleted",
            message=f"Étape supprimée : {step_title}",
            user=self.request.user,
        )


class StepCommentCreateAPIView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StepCommentCreateSerializer

    def perform_create(self, serializer):
        step = generics.get_object_or_404(ProjectStep, pk=self.kwargs["step_id"])

        if step.project.status == ProjectStatus.CANCELLED:
            raise ValidationError({
                "detail": "Impossible d’ajouter un commentaire à un projet annulé."
            })

        comment = serializer.save(step=step, author=self.request.user)

        log_project_activity(
            project=step.project,
            action_type="comment_created",
            message=f"Commentaire ajouté sur l’étape : {step.title}",
            user=self.request.user,
        )


class CommentDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InternalCommentUpdateSerializer
    queryset = Comment.objects.select_related("author", "step", "step__project")

    def perform_update(self, serializer):
        comment = serializer.save()

        log_project_activity(
            project=comment.step.project,
            action_type="comment_updated",
            message=f"Commentaire modifié sur l’étape : {comment.step.title}",
            user=self.request.user,
        )

    def perform_destroy(self, instance):
        project = instance.step.project
        step_title = instance.step.title
        instance.delete()

        log_project_activity(
            project=project,
            action_type="comment_deleted",
            message=f"Commentaire supprimé sur l’étape : {step_title}",
            user=self.request.user,
        )


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
        attachment = serializer.save(
            step=step,
            file_name=uploaded_file.name if uploaded_file else "",
            file_type=getattr(uploaded_file, "content_type", "") or "",
        )

        log_project_activity(
            project=step.project,
            action_type="attachment_created",
            message=f"Pièce jointe ajoutée : {attachment.file_name or 'Fichier'}",
            user=self.request.user,
        )


class AttachmentDetailUpdateDeleteAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AttachmentVisibilityUpdateSerializer
    queryset = Attachment.objects.select_related("step", "step__project")

    def perform_update(self, serializer):
        instance = self.get_object()
        old_visibility = instance.visible_to_client

        attachment = serializer.save()

        if old_visibility != attachment.visible_to_client:
            message = (
                f"Visibilité modifiée pour la pièce jointe : {attachment.file_name} "
                f"({'visible client' if attachment.visible_to_client else 'non visible client'})"
            )
        else:
            message = f"Pièce jointe modifiée : {attachment.file_name}"

        log_project_activity(
            project=attachment.step.project,
            action_type="attachment_updated",
            message=message,
            user=self.request.user,
        )

    def perform_destroy(self, instance):
        project = instance.step.project
        file_name = instance.file_name
        instance.delete()

        log_project_activity(
            project=project,
            action_type="attachment_deleted",
            message=f"Pièce jointe supprimée : {file_name}",
            user=self.request.user,
        )
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Attachment, Client, Comment, Project, ProjectStep, ProjectStatus

User = get_user_model()


def validate_step_status_reason(serializer, attrs):
    status = attrs.get("status", getattr(serializer.instance, "status", None))
    reason = attrs.get("status_reason", getattr(serializer.instance, "status_reason", ""))

    reason = (reason or "").strip()

    if status in [ProjectStep.StepStatus.BLOCKED, ProjectStep.StepStatus.DELAYED] and not reason:
        raise serializers.ValidationError({
            "status_reason": "La cause est obligatoire pour une étape bloquée ou en retard."
        })

    if status not in [ProjectStep.StepStatus.BLOCKED, ProjectStep.StepStatus.DELAYED]:
        attrs["status_reason"] = ""

    return attrs


def validate_project_cancellation(serializer, attrs):
    status = attrs.get("status", getattr(serializer.instance, "status", None))
    reason = attrs.get(
        "cancellation_reason",
        getattr(serializer.instance, "cancellation_reason", "")
    )

    reason = (reason or "").strip()

    if status == ProjectStatus.CANCELLED and not reason:
        raise serializers.ValidationError({
            "cancellation_reason": "La cause d’annulation est obligatoire."
        })

    if status != ProjectStatus.CANCELLED:
        attrs["cancellation_reason"] = ""

    return attrs


class PublicCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "content", "author_name", "created_at"]

    def get_author_name(self, obj):
        if obj.author:
            full_name = f"{obj.author.first_name} {obj.author.last_name}".strip()
            return full_name or obj.author.username
        return "Utilisateur interne"


class PublicAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ["id", "file_name", "file_type", "file_url", "uploaded_at"]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class InternalCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "content",
            "visible_to_client",
            "author_name",
            "created_at",
        ]

    def get_author_name(self, obj):
        if obj.author:
            full_name = f"{obj.author.first_name} {obj.author.last_name}".strip()
            return full_name or obj.author.username
        return "Utilisateur interne"


class StepCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = [
            "id",
            "content",
            "visible_to_client",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_content(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Le commentaire ne peut pas être vide.")
        return value


class InternalCommentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = [
            "id",
            "content",
            "visible_to_client",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_content(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Le commentaire ne peut pas être vide.")
        return value


class InternalAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id",
            "file_name",
            "file_type",
            "file_url",
            "visible_to_client",
            "uploaded_at",
        ]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class StepAttachmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = [
            "id",
            "file",
            "visible_to_client",
            "uploaded_at",
        ]
        read_only_fields = ["id", "uploaded_at"]

    def validate_file(self, value):
        if not value:
            raise serializers.ValidationError("Le fichier est obligatoire.")
        return value


class AttachmentVisibilityUpdateSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id",
            "file_name",
            "file_type",
            "file_url",
            "visible_to_client",
            "uploaded_at",
        ]
        read_only_fields = [
            "id",
            "file_name",
            "file_type",
            "file_url",
            "uploaded_at",
        ]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class PublicProjectStepSerializer(serializers.ModelSerializer):
    comments = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = ProjectStep
        fields = [
            "id",
            "title",
            "description",
            "step_order",
            "status",
            "status_reason",
            "planned_start_date",
            "planned_end_date",
            "actual_start_date",
            "actual_end_date",
            "client_visible",
            "comments",
            "attachments",
        ]

    def get_comments(self, obj):
        queryset = obj.comments.filter(visible_to_client=True).order_by("created_at")
        return PublicCommentSerializer(queryset, many=True).data

    def get_attachments(self, obj):
        queryset = obj.attachments.filter(visible_to_client=True).order_by("-uploaded_at")
        return PublicAttachmentSerializer(
            queryset,
            many=True,
            context=self.context,
        ).data


class PublicProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    client_company = serializers.CharField(source="client.company", read_only=True)
    steps = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "project_type",
            "status",
            "cancellation_reason",
            "start_date",
            "expected_end_date",
            "actual_end_date",
            "progress_percentage",
            "is_blocked",
            "client_name",
            "client_company",
            "steps",
        ]

    def get_steps(self, obj):
        queryset = obj.steps.filter(client_visible=True).order_by("step_order")
        return PublicProjectStepSerializer(
            queryset,
            many=True,
            context=self.context,
        ).data


class InternalProjectStepSerializer(serializers.ModelSerializer):
    comments = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = ProjectStep
        fields = [
            "id",
            "title",
            "description",
            "step_order",
            "status",
            "status_reason",
            "planned_start_date",
            "planned_end_date",
            "actual_start_date",
            "actual_end_date",
            "client_visible",
            "comments",
            "attachments",
            "created_at",
            "updated_at",
        ]

    def get_comments(self, obj):
        queryset = obj.comments.select_related("author").order_by("-created_at")
        return InternalCommentSerializer(queryset, many=True).data

    def get_attachments(self, obj):
        queryset = obj.attachments.order_by("-uploaded_at")
        return InternalAttachmentSerializer(
            queryset,
            many=True,
            context=self.context
        ).data


class InternalProjectListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    project_manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "project_type",
            "status",
            "cancellation_reason",
            "progress_percentage",
            "is_blocked",
            "start_date",
            "expected_end_date",
            "actual_end_date",
            "client",
            "client_name",
            "project_manager",
            "project_manager_name",
            "created_at",
            "updated_at",
        ]

    def get_project_manager_name(self, obj):
        if obj.project_manager:
            full_name = f"{obj.project_manager.first_name} {obj.project_manager.last_name}".strip()
            return full_name or obj.project_manager.username
        return None


class InternalProjectDetailSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.name", read_only=True)
    client_company = serializers.CharField(source="client.company", read_only=True)
    client_email = serializers.CharField(source="client.email", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    steps = InternalProjectStepSerializer(many=True, read_only=True)
    access_token = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "project_type",
            "status",
            "cancellation_reason",
            "start_date",
            "expected_end_date",
            "actual_end_date",
            "access_token",
            "progress_percentage",
            "is_blocked",
            "client",
            "client_name",
            "client_company",
            "client_email",
            "client_phone",
            "created_by",
            "project_manager",
            "steps",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_access_token(self, obj):
        access_link = getattr(obj, "access_link", None)
        if access_link:
            return str(access_link.token)
        return None


class ProjectStepCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectStep
        fields = [
            "title",
            "description",
            "step_order",
            "status",
            "status_reason",
            "planned_start_date",
            "planned_end_date",
            "actual_start_date",
            "actual_end_date",
            "client_visible",
        ]

    def validate(self, attrs):
        return validate_step_status_reason(self, attrs)


class InternalProjectCreateUpdateSerializer(serializers.ModelSerializer):
    steps = ProjectStepCreateSerializer(many=True, required=False)

    class Meta:
        model = Project
        fields = [
            "id",
            "client",
            "project_manager",
            "title",
            "description",
            "project_type",
            "status",
            "cancellation_reason",
            "start_date",
            "expected_end_date",
            "steps",
        ]

    def validate(self, attrs):
        return validate_project_cancellation(self, attrs)

    def create(self, validated_data):
        steps_data = validated_data.pop("steps", [])
        project = Project.objects.create(**validated_data)

        for index, step_data in enumerate(steps_data, start=1):
            if not step_data.get("step_order"):
                step_data["step_order"] = index
            ProjectStep.objects.create(project=project, **step_data)

        project.recalculate_progress_and_status()
        return project

    def update(self, instance, validated_data):
        validated_data.pop("steps", None)
        project = super().update(instance, validated_data)
        return project


class InternalProjectStepUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectStep
        fields = [
            "id",
            "title",
            "description",
            "step_order",
            "status",
            "status_reason",
            "planned_start_date",
            "planned_end_date",
            "actual_start_date",
            "actual_end_date",
            "client_visible",
        ]

    def validate(self, attrs):
        return validate_step_status_reason(self, attrs)


class ProjectStepManageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectStep
        fields = [
            "id",
            "project",
            "title",
            "description",
            "step_order",
            "status",
            "status_reason",
            "planned_start_date",
            "planned_end_date",
            "actual_start_date",
            "actual_end_date",
            "client_visible",
        ]
        read_only_fields = ["project"]

    def validate(self, attrs):
        return validate_step_status_reason(self, attrs)


class ClientListSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "name",
            "company",
            "email",
            "phone",
            "address",
            "notes",
            "label",
            "created_at",
            "updated_at",
        ]

    def get_label(self, obj):
        if obj.company:
            return f"{obj.name} - {obj.company}"
        return obj.name


class ClientCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            "id",
            "name",
            "company",
            "email",
            "phone",
            "address",
            "notes",
        ]

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Le nom du client est obligatoire.")
        return value


class InternalUserOptionSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "label"]

    def get_label(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.username
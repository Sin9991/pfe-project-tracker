import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Client(TimeStampedModel):
    name = models.CharField(max_length=150)
    company = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        if self.company:
            return f"{self.name} - {self.company}"
        return self.name


class ProjectStatus(models.TextChoices):
    DRAFT = "draft", "Brouillon"
    IN_PROGRESS = "in_progress", "En cours"
    COMPLETED = "completed", "Terminé"
    DELAYED = "delayed", "En retard"
    BLOCKED = "blocked", "Bloqué"
    CANCELLED = "cancelled", "Annulé"


class Project(TimeStampedModel):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    project_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_projects",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_projects",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    project_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.DRAFT,
    )
    cancellation_reason = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    is_blocked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def recalculate_progress_and_status(self, save=True):
        if self.status == ProjectStatus.CANCELLED:
            if save:
                self.save(
                    update_fields=[
                        "status",
                        "cancellation_reason",
                        "updated_at",
                    ]
                )
            return

        steps = list(self.steps.all().order_by("step_order"))
        total_steps = len(steps)

        if total_steps == 0:
            self.progress_percentage = Decimal("0.00")
            self.is_blocked = False
            self.status = ProjectStatus.DRAFT
            self.actual_end_date = None
            if save:
                self.save(
                    update_fields=[
                        "progress_percentage",
                        "is_blocked",
                        "status",
                        "actual_end_date",
                        "updated_at",
                    ]
                )
            return

        completed_steps = sum(1 for step in steps if step.status == ProjectStep.StepStatus.COMPLETED)
        has_blocked = any(step.status == ProjectStep.StepStatus.BLOCKED for step in steps)
        has_delayed = any(step.status == ProjectStep.StepStatus.DELAYED for step in steps)
        has_in_progress = any(step.status == ProjectStep.StepStatus.IN_PROGRESS for step in steps)
        has_started = any(
            step.status in {
                ProjectStep.StepStatus.IN_PROGRESS,
                ProjectStep.StepStatus.COMPLETED,
                ProjectStep.StepStatus.DELAYED,
                ProjectStep.StepStatus.BLOCKED,
            }
            for step in steps
        )

        self.progress_percentage = (Decimal(completed_steps) / Decimal(total_steps)) * Decimal("100.00")
        self.is_blocked = has_blocked

        if completed_steps == total_steps:
            self.status = ProjectStatus.COMPLETED
            self.actual_end_date = self.actual_end_date or timezone.localdate()
        elif has_blocked:
            self.status = ProjectStatus.BLOCKED
            self.actual_end_date = None
        elif has_delayed:
            self.status = ProjectStatus.DELAYED
            self.actual_end_date = None
        elif has_in_progress or has_started:
            self.status = ProjectStatus.IN_PROGRESS
            self.actual_end_date = None
        else:
            self.status = ProjectStatus.DRAFT
            self.actual_end_date = None

        if save:
            self.save(
                update_fields=[
                    "progress_percentage",
                    "is_blocked",
                    "status",
                    "actual_end_date",
                    "updated_at",
                ]
            )


class ProjectStep(TimeStampedModel):
    class StepStatus(models.TextChoices):
        NOT_STARTED = "not_started", "Non démarrée"
        IN_PROGRESS = "in_progress", "En cours"
        COMPLETED = "completed", "Terminée"
        DELAYED = "delayed", "En retard"
        BLOCKED = "blocked", "Bloquée"

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    step_order = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=StepStatus.choices,
        default=StepStatus.NOT_STARTED,
    )
    status_reason = models.TextField(blank=True)
    planned_start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    actual_start_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    client_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["step_order"]

    def __str__(self):
        return f"{self.project.title} - Étape {self.step_order}: {self.title}"


class Comment(TimeStampedModel):
    step = models.ForeignKey(
        ProjectStep,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="project_comments",
    )
    content = models.TextField()
    visible_to_client = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Commentaire étape {self.step_id}"


class Attachment(models.Model):
    step = models.ForeignKey(
        ProjectStep,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="attachments/%Y/%m/%d/")
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)
    visible_to_client = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.file_name or f"Attachment {self.pk}"


class ProjectAccessLink(TimeStampedModel):
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name="access_link",
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Accès public - {self.project.title}"


class AccessLog(models.Model):
    access_link = models.ForeignKey(
        ProjectAccessLink,
        on_delete=models.CASCADE,
        related_name="access_logs",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-accessed_at"]

    def __str__(self):
        return f"Accès {self.access_link.project.title} - {self.accessed_at}"
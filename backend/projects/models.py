import uuid
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Client(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    company = models.CharField(max_length=150, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        if self.company:
            return f"{self.name} - {self.company}"
        return self.name


class ProjectStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    DELAYED = "delayed", "Delayed"
    BLOCKED = "blocked", "Blocked"
    CANCELLED = "cancelled", "Cancelled"


class StepStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not Started"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    DELAYED = "delayed", "Delayed"
    BLOCKED = "blocked", "Blocked"


class Project(TimeStampedModel):
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="projects"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_projects"
    )
    project_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_projects"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    project_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.DRAFT
    )
    cancellation_reason = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00
    )
    is_blocked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def clean(self):
        reason = (self.cancellation_reason or "").strip()

        if self.status == ProjectStatus.CANCELLED and not reason:
            raise ValidationError({
                "cancellation_reason": "La cause d’annulation est obligatoire."
            })

        if self.status != ProjectStatus.CANCELLED:
            self.cancellation_reason = ""

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def recalculate_progress_and_status(self):
        steps = self.steps.all()
        total_steps = steps.count()

        if total_steps == 0:
            progress = Decimal("0.00")
        else:
            completed_steps = steps.filter(status=StepStatus.COMPLETED).count()
            progress = (Decimal(completed_steps) / Decimal(total_steps)) * Decimal("100")
            progress = progress.quantize(Decimal("0.01"))

        if self.status == ProjectStatus.CANCELLED:
            self.progress_percentage = progress
            self.is_blocked = False
            if not self.actual_end_date:
                self.actual_end_date = timezone.localdate()
            self.save(update_fields=[
                "progress_percentage",
                "is_blocked",
                "actual_end_date",
                "updated_at",
            ])
            return

        if total_steps == 0:
            self.progress_percentage = Decimal("0.00")
            self.status = ProjectStatus.DRAFT
            self.is_blocked = False
            self.actual_end_date = None
            self.save(update_fields=[
                "progress_percentage",
                "status",
                "is_blocked",
                "actual_end_date",
                "updated_at",
            ])
            return

        completed_steps = steps.filter(status=StepStatus.COMPLETED).count()
        blocked_exists = steps.filter(status=StepStatus.BLOCKED).exists()
        delayed_exists = steps.filter(status=StepStatus.DELAYED).exists()
        in_progress_exists = steps.filter(status=StepStatus.IN_PROGRESS).exists()

        self.progress_percentage = progress

        if blocked_exists:
            self.status = ProjectStatus.BLOCKED
            self.is_blocked = True
            self.actual_end_date = None
        elif completed_steps == total_steps:
            self.status = ProjectStatus.COMPLETED
            self.is_blocked = False
            if not self.actual_end_date:
                self.actual_end_date = timezone.localdate()
        elif delayed_exists:
            self.status = ProjectStatus.DELAYED
            self.is_blocked = False
            self.actual_end_date = None
        elif in_progress_exists or completed_steps > 0:
            self.status = ProjectStatus.IN_PROGRESS
            self.is_blocked = False
            self.actual_end_date = None
        else:
            self.status = ProjectStatus.DRAFT
            self.is_blocked = False
            self.actual_end_date = None

        self.save(update_fields=[
            "progress_percentage",
            "status",
            "is_blocked",
            "actual_end_date",
            "updated_at",
        ])


class ProjectStep(TimeStampedModel):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="steps"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    step_order = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=StepStatus.choices,
        default=StepStatus.NOT_STARTED
    )
    status_reason = models.TextField(blank=True)
    planned_start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    actual_start_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    client_visible = models.BooleanField(default=True)

    class Meta:
        ordering = ["project", "step_order"]
        unique_together = ("project", "step_order")

    def __str__(self):
        return f"{self.project.title} - Step {self.step_order}: {self.title}"

    def clean(self):
        reason = (self.status_reason or "").strip()

        if self.status in [StepStatus.BLOCKED, StepStatus.DELAYED] and not reason:
            raise ValidationError({
                "status_reason": "La cause est obligatoire pour une étape bloquée ou en retard."
            })

        if self.status not in [StepStatus.BLOCKED, StepStatus.DELAYED]:
            self.status_reason = ""

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class Comment(models.Model):
    step = models.ForeignKey(
        ProjectStep,
        on_delete=models.CASCADE,
        related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="project_comments"
    )
    content = models.TextField()
    visible_to_client = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.step.title}"


class Attachment(models.Model):
    step = models.ForeignKey(
        ProjectStep,
        on_delete=models.CASCADE,
        related_name="attachments"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_attachments"
    )
    file = models.FileField(upload_to="project_attachments/")
    file_name = models.CharField(max_length=255, blank=True)
    file_type = models.CharField(max_length=50, blank=True)
    visible_to_client = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.file_name or "Attachment"


class ProjectAccessLink(models.Model):
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name="access_link"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Access link for {self.project.title}"


class AccessLog(models.Model):
    access_link = models.ForeignKey(
        ProjectAccessLink,
        on_delete=models.CASCADE,
        related_name="access_logs"
    )
    accessed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ["-accessed_at"]

    def __str__(self):
        return f"Access on {self.accessed_at}"
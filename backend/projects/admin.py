from django.contrib import admin

from .models import (
    AccessLog,
    Attachment,
    Client,
    Comment,
    Project,
    ProjectAccessLink,
    ProjectStep,
)


class ProjectStepInline(admin.TabularInline):
    model = ProjectStep
    extra = 0
    fields = (
        "step_order",
        "title",
        "status",
        "status_reason",
        "planned_start_date",
        "planned_end_date",
        "actual_start_date",
        "actual_end_date",
        "client_visible",
    )
    ordering = ("step_order",)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "email", "phone", "created_at")
    search_fields = ("name", "company", "email", "phone", "address")
    list_filter = ("created_at",)
    ordering = ("name",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "client",
        "status",
        "progress_percentage",
        "is_blocked",
        "project_manager",
        "start_date",
        "expected_end_date",
        "actual_end_date",
        "created_at",
    )
    list_filter = (
        "status",
        "is_blocked",
        "client",
        "project_manager",
        "created_at",
    )
    search_fields = (
        "title",
        "description",
        "project_type",
        "client__name",
        "client__company",
    )
    autocomplete_fields = ("client", "project_manager", "created_by")
    readonly_fields = (
        "progress_percentage",
        "is_blocked",
        "actual_end_date",
        "created_at",
        "updated_at",
    )
    inlines = [ProjectStepInline]


@admin.register(ProjectStep)
class ProjectStepAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "step_order",
        "status",
        "client_visible",
        "planned_start_date",
        "planned_end_date",
        "updated_at",
    )
    list_filter = ("status", "client_visible", "planned_start_date", "planned_end_date")
    search_fields = ("title", "description", "project__title", "project__client__name")
    autocomplete_fields = ("project",)
    ordering = ("project", "step_order")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("step", "author", "visible_to_client", "created_at")
    list_filter = ("visible_to_client", "created_at")
    search_fields = ("content", "step__title", "step__project__title", "author__username")
    autocomplete_fields = ("step", "author")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("file_name", "step", "file_type", "visible_to_client", "uploaded_at")
    list_filter = ("visible_to_client", "uploaded_at", "file_type")
    search_fields = ("file_name", "file_type", "step__title", "step__project__title")
    autocomplete_fields = ("step",)


@admin.register(ProjectAccessLink)
class ProjectAccessLinkAdmin(admin.ModelAdmin):
    list_display = ("project", "token", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("project__title", "project__client__name", "token")
    autocomplete_fields = ("project",)
    readonly_fields = ("token", "created_at", "updated_at")


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ("access_link", "ip_address", "accessed_at")
    list_filter = ("accessed_at",)
    search_fields = ("access_link__project__title", "ip_address", "user_agent")
    autocomplete_fields = ("access_link",)
    readonly_fields = ("accessed_at",)
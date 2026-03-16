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
    extra = 1


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "company", "email", "phone", "created_at")
    search_fields = ("name", "company", "email", "phone")
    list_filter = ("created_at",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "client",
        "project_type",
        "status",
        "project_manager",
        "progress_percentage",
        "is_blocked",
        "expected_end_date",
        "created_at",
    )
    list_filter = ("status", "is_blocked", "project_type", "created_at")
    search_fields = ("title", "description", "client__name", "client__company")
    autocomplete_fields = ("client", "created_by", "project_manager")
    inlines = [ProjectStepInline]


@admin.register(ProjectStep)
class ProjectStepAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "step_order",
        "status",
        "client_visible",
        "planned_end_date",
        "actual_end_date",
        "created_at",
    )
    list_filter = ("status", "client_visible", "created_at")
    search_fields = ("title", "description", "project__title")
    autocomplete_fields = ("project",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("step", "author", "visible_to_client", "created_at")
    list_filter = ("visible_to_client", "created_at")
    search_fields = ("content", "step__title", "step__project__title")
    autocomplete_fields = ("step", "author")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = (
        "file_name",
        "step",
        "uploaded_by",
        "file_type",
        "visible_to_client",
        "uploaded_at",
    )
    list_filter = ("visible_to_client", "file_type", "uploaded_at")
    search_fields = ("file_name", "step__title", "step__project__title")
    autocomplete_fields = ("step", "uploaded_by")


@admin.register(ProjectAccessLink)
class ProjectAccessLinkAdmin(admin.ModelAdmin):
    list_display = ("project", "token", "is_active", "expires_at", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("project__title", "token")
    autocomplete_fields = ("project",)


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ("access_link", "ip_address", "accessed_at")
    list_filter = ("accessed_at",)
    search_fields = ("ip_address", "user_agent", "access_link__project__title")
    autocomplete_fields = ("access_link",)
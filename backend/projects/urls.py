from django.urls import path

from .views import (
    AttachmentDetailUpdateDeleteAPIView,
    ClientDetailAPIView,
    ClientListAPIView,
    CommentDetailUpdateDeleteAPIView,
    DashboardAPIView,
    InternalProjectDetailView,
    InternalProjectListCreateView,
    InternalProjectStepDetailUpdateView,
    InternalUserListAPIView,
    ProjectStepCreateForProjectAPIView,
    PublicProjectDetailView,
    StepAttachmentCreateAPIView,
    StepCommentCreateAPIView,
    AdminUserDetailAPIView,
    AdminUserListCreateAPIView,
    CSRFCookieView,
    CurrentUserAPIView,
    LoginAPIView,
    LogoutAPIView,
)

urlpatterns = [
    path("auth/csrf/", CSRFCookieView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/me/", CurrentUserAPIView.as_view(), name="auth-me"),

    path("admin/users/", AdminUserListCreateAPIView.as_view(), name="admin-user-list-create"),
    path("admin/users/<int:pk>/", AdminUserDetailAPIView.as_view(), name="admin-user-detail"),
    path("public/project/<uuid:token>/", PublicProjectDetailView.as_view(), name="public-project-detail"),

    path("dashboard/", DashboardAPIView.as_view(), name="dashboard"),

    path("clients/", ClientListAPIView.as_view(), name="client-list"),
    path("clients/<int:pk>/", ClientDetailAPIView.as_view(), name="client-detail"),

    path("users/", InternalUserListAPIView.as_view(), name="internal-user-list"),

    path("projects/", InternalProjectListCreateView.as_view(), name="internal-project-list-create"),
    path("projects/<int:pk>/", InternalProjectDetailView.as_view(), name="internal-project-detail"),

    path(
        "projects/<int:project_id>/steps/",
        ProjectStepCreateForProjectAPIView.as_view(),
        name="project-step-create",
    ),

    path("steps/<int:pk>/", InternalProjectStepDetailUpdateView.as_view(), name="internal-step-detail-update"),
    path(
        "steps/<int:step_id>/comments/",
        StepCommentCreateAPIView.as_view(),
        name="step-comment-create",
    ),
    path(
        "comments/<int:pk>/",
        CommentDetailUpdateDeleteAPIView.as_view(),
        name="comment-detail-update-delete",
    ),

    path(
        "steps/<int:step_id>/attachments/",
        StepAttachmentCreateAPIView.as_view(),
        name="step-attachment-create",
    ),
    path(
        "attachments/<int:pk>/",
        AttachmentDetailUpdateDeleteAPIView.as_view(),
        name="attachment-detail-update-delete",
    ),
]
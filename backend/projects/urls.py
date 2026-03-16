from django.urls import path

from .views import (
    ClientListAPIView,
    DashboardAPIView,
    InternalProjectDetailView,
    InternalProjectListCreateView,
    InternalProjectStepDetailUpdateView,
    InternalUserListAPIView,
    ProjectStepCreateForProjectAPIView,
    PublicProjectDetailView,
)

urlpatterns = [
    path("public/project/<uuid:token>/", PublicProjectDetailView.as_view(), name="public-project-detail"),

    path("dashboard/", DashboardAPIView.as_view(), name="dashboard"),
    path("clients/", ClientListAPIView.as_view(), name="client-list"),
    path("users/", InternalUserListAPIView.as_view(), name="internal-user-list"),

    path("projects/", InternalProjectListCreateView.as_view(), name="internal-project-list-create"),
    path("projects/<int:pk>/", InternalProjectDetailView.as_view(), name="internal-project-detail"),
    path(
        "projects/<int:project_id>/steps/",
        ProjectStepCreateForProjectAPIView.as_view(),
        name="project-step-create",
    ),

    path("steps/<int:pk>/", InternalProjectStepDetailUpdateView.as_view(), name="internal-step-detail-update"),
]
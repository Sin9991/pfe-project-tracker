from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Project, ProjectAccessLink, ProjectStep


@receiver(post_save, sender=Project)
def create_project_access_link(sender, instance, created, **kwargs):
    if created:
        ProjectAccessLink.objects.get_or_create(project=instance)


@receiver(post_save, sender=ProjectStep)
def update_project_after_step_save(sender, instance, **kwargs):
    instance.project.recalculate_progress_and_status()


@receiver(post_delete, sender=ProjectStep)
def update_project_after_step_delete(sender, instance, **kwargs):
    instance.project.recalculate_progress_and_status()
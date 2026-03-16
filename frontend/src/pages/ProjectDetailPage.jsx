import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return null;
}

const STEP_STATUS_OPTIONS = [
  { value: "not_started", label: "Non démarrée" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "delayed", label: "En retard" },
  { value: "blocked", label: "Bloquée" },
];

function needsReason(status) {
  return status === "blocked" || status === "delayed";
}

function getStatusLabel(status) {
  const labels = {
    draft: "Brouillon",
    in_progress: "En cours",
    completed: "Terminé",
    delayed: "En retard",
    blocked: "Bloqué",
    cancelled: "Annulé",
    not_started: "Non démarrée",
  };

  return labels[status] || status;
}

function StepCard({
  step,
  editedStatus,
  editedReason,
  onStatusChange,
  onReasonChange,
  onSaveStep,
  savingStepId,
  disabled,
}) {
  const isSaving = savingStepId === step.id;

  return (
    <div className="timeline-step">
      <div className="timeline-marker"></div>

      <div className="timeline-content">
        <div className="timeline-header">
          <h3>
            Étape {step.step_order} — {step.title}
          </h3>

          <span className={`status-badge status-${step.status}`}>
            {getStatusLabel(step.status)}
          </span>
        </div>

        <p className="timeline-description">
          {step.description || "Aucune description."}
        </p>

        <div className="timeline-dates">
          <span>Début prévu : {step.planned_start_date || "-"}</span>
          <span>Fin prévue : {step.planned_end_date || "-"}</span>
          <span>Début réel : {step.actual_start_date || "-"}</span>
          <span>Fin réelle : {step.actual_end_date || "-"}</span>
        </div>

        <div className="timeline-meta">
          <span>Visible client : {step.client_visible ? "Oui" : "Non"}</span>
        </div>

        {step.status_reason && (
          <div className="status-reason-box">
            <strong>Cause signalée :</strong> {step.status_reason}
          </div>
        )}

        <div className="step-actions-column">
          <div className="step-actions">
            <select
              value={editedStatus}
              onChange={(e) => onStatusChange(step.id, e.target.value)}
              disabled={disabled}
            >
              {STEP_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => onSaveStep(step)}
              disabled={isSaving || disabled}
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>

          {needsReason(editedStatus) && (
            <div className="form-group reason-inline-group">
              <label>Cause du blocage / retard</label>
              <textarea
                rows="3"
                value={editedReason}
                onChange={(e) => onReasonChange(step.id, e.target.value)}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [editedStatuses, setEditedStatuses] = useState({});
  const [editedReasons, setEditedReasons] = useState({});
  const [savingStepId, setSavingStepId] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [creatingStep, setCreatingStep] = useState(false);
  const [showAddStepForm, setShowAddStepForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellingProject, setCancellingProject] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [newStep, setNewStep] = useState({
    title: "",
    status: "not_started",
    status_reason: "",
    planned_start_date: "",
    planned_end_date: "",
    client_visible: true,
  });

  const projectCancelled = project?.status === "cancelled";

  const fetchProject = async (preserveMessage = false) => {
    try {
      setLoading(true);
      setError("");
      if (!preserveMessage) {
        setSuccessMessage("");
      }

      const response = await axios.get(`/api/projects/${id}/`, {
        withCredentials: true,
      });

      setProject(response.data);
      setCancellationReason(response.data.cancellation_reason || "");

      const initialStatuses = {};
      const initialReasons = {};

      (response.data.steps || []).forEach((step) => {
        initialStatuses[step.id] = step.status;
        initialReasons[step.id] = step.status_reason || "";
      });

      setEditedStatuses(initialStatuses);
      setEditedReasons(initialReasons);
    } catch (err) {
      setError(
        "Impossible de charger le projet. Vérifie que tu es connecté sur http://localhost:8000/admin/."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleStatusChange = (stepId, newStatus) => {
    setEditedStatuses((prev) => ({
      ...prev,
      [stepId]: newStatus,
    }));

    if (!needsReason(newStatus)) {
      setEditedReasons((prev) => ({
        ...prev,
        [stepId]: "",
      }));
    }
  };

  const handleReasonChange = (stepId, newReason) => {
    setEditedReasons((prev) => ({
      ...prev,
      [stepId]: newReason,
    }));
  };

  const handleSaveStep = async (step) => {
    try {
      setSavingStepId(step.id);
      setError("");
      setSuccessMessage("");

      await axios.patch(
        `/api/steps/${step.id}/`,
        {
          status: editedStatuses[step.id],
          status_reason: editedReasons[step.id] || "",
        },
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
          },
        }
      );

      await fetchProject(true);
      setSuccessMessage("Étape mise à jour avec succès.");
    } catch (err) {
      console.error(err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Impossible de mettre à jour l’étape."
      );
    } finally {
      setSavingStepId(null);
    }
  };

  const handleDeleteProject = async () => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce projet ?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingProject(true);
      setError("");
      setSuccessMessage("");

      await axios.delete(`/api/projects/${id}/`, {
        withCredentials: true,
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });

      navigate("/projects");
    } catch (err) {
      setError("Impossible de supprimer le projet.");
      console.error(err);
    } finally {
      setDeletingProject(false);
    }
  };

  const handleCancelProject = async () => {
    try {
      if (!cancellationReason.trim()) {
        setError("La cause d’annulation est obligatoire.");
        return;
      }

      setCancellingProject(true);
      setError("");
      setSuccessMessage("");

      await axios.patch(
        `/api/projects/${id}/`,
        {
          status: "cancelled",
          cancellation_reason: cancellationReason,
        },
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
          },
        }
      );

      setShowCancelForm(false);
      await fetchProject(true);
      setSuccessMessage("Projet annulé avec succès.");
    } catch (err) {
      console.error(err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Impossible d’annuler le projet."
      );
    } finally {
      setCancellingProject(false);
    }
  };

  const handleNewStepChange = (field, value) => {
    setNewStep((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      if (field === "status" && !needsReason(value)) {
        updated.status_reason = "";
      }

      return updated;
    });
  };

  const resetNewStep = () => {
    setNewStep({
      title: "",
      status: "not_started",
      status_reason: "",
      planned_start_date: "",
      planned_end_date: "",
      client_visible: true,
    });
  };

  const handleCreateStep = async () => {
    try {
      if (!newStep.title.trim()) {
        setError("Le titre de l’étape est obligatoire.");
        return;
      }

      setCreatingStep(true);
      setError("");
      setSuccessMessage("");

      await axios.post(
        `/api/projects/${id}/steps/`,
        {
          title: newStep.title,
          description: "",
          step_order: (project?.steps?.length || 0) + 1,
          status: newStep.status,
          status_reason: newStep.status_reason || "",
          planned_start_date: newStep.planned_start_date || null,
          planned_end_date: newStep.planned_end_date || null,
          actual_start_date: null,
          actual_end_date: null,
          client_visible: newStep.client_visible,
        },
        {
          withCredentials: true,
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
          },
        }
      );

      resetNewStep();
      setShowAddStepForm(false);
      await fetchProject(true);
      setSuccessMessage("Étape ajoutée avec succès.");
    } catch (err) {
      console.error(err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Impossible d’ajouter l’étape."
      );
    } finally {
      setCreatingStep(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Chargement du projet...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="page error">
        <p>{error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page">
        <p>Projet introuvable.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <Link to="/projects" className="back-link">
            ← Retour à la liste des projets
          </Link>
          <h1>{project.title}</h1>
          <p>Détail du projet et suivi des étapes</p>
        </div>

        <div className="header-actions">
          <button onClick={() => fetchProject()}>Rafraîchir</button>

          {!projectCancelled && (
            <button type="button" onClick={() => setShowCancelForm((prev) => !prev)}>
              {showCancelForm ? "Fermer annulation" : "Annuler le projet"}
            </button>
          )}

          <button
            className="danger-button"
            onClick={handleDeleteProject}
            disabled={deletingProject}
          >
            {deletingProject ? "Suppression..." : "Supprimer le projet"}
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      {projectCancelled && project.cancellation_reason && (
        <section className="panel">
          <h2>Projet annulé</h2>
          <div className="status-reason-box">
            <strong>Cause d’annulation :</strong> {project.cancellation_reason}
          </div>
        </section>
      )}

      {showCancelForm && !projectCancelled && (
        <section className="panel">
          <h2>Annuler le projet</h2>
          <div className="form-group">
            <label>Cause d’annulation</label>
            <textarea
              rows="4"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="danger-button"
              onClick={handleCancelProject}
              disabled={cancellingProject}
            >
              {cancellingProject ? "Annulation..." : "Confirmer l’annulation"}
            </button>
          </div>
        </section>
      )}

      {project.access_token && (
        <section className="panel">
          <h2>Lien client</h2>
          <div className="public-link-box">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/track/${project.access_token}`}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/track/${project.access_token}`
                );
                setSuccessMessage("Lien client copié avec succès.");
              }}
            >
              Copier
            </button>
          </div>
        </section>
      )}

      <section className="project-summary-grid">
        <div className="summary-card">
          <h3>Informations générales</h3>
          <p><strong>Type :</strong> {project.project_type || "-"}</p>
          <p><strong>Statut :</strong> {getStatusLabel(project.status)}</p>
          <p><strong>Avancement :</strong> {project.progress_percentage}%</p>
          <p><strong>Bloqué :</strong> {project.is_blocked ? "Oui" : "Non"}</p>
        </div>

        <div className="summary-card">
          <h3>Client</h3>
          <p><strong>Nom :</strong> {project.client_name || "-"}</p>
          <p><strong>Société :</strong> {project.client_company || "-"}</p>
          <p><strong>ID client :</strong> {project.client}</p>
        </div>

        <div className="summary-card">
          <h3>Dates</h3>
          <p><strong>Début :</strong> {project.start_date || "-"}</p>
          <p><strong>Fin prévue :</strong> {project.expected_end_date || "-"}</p>
          <p><strong>Fin réelle :</strong> {project.actual_end_date || "-"}</p>
        </div>

        <div className="summary-card">
          <h3>Gestion</h3>
          <p><strong>Manager :</strong> {project.project_manager || "-"}</p>
          <p><strong>Créé par :</strong> {project.created_by || "-"}</p>
        </div>
      </section>

      <section className="panel">
        <h2>Description</h2>
        <p className="project-description">
          {project.description || "Aucune description."}
        </p>
      </section>

      <section className="panel">
        <div className="panel-header-row">
          <h2>Timeline des étapes</h2>

          {!projectCancelled && (
            <button
              type="button"
              onClick={() => setShowAddStepForm((prev) => !prev)}
            >
              {showAddStepForm ? "Fermer" : "Ajouter une étape"}
            </button>
          )}
        </div>

        {showAddStepForm && !projectCancelled && (
          <div className="inline-step-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Titre de l’étape</label>
                <input
                  type="text"
                  value={newStep.title}
                  onChange={(e) =>
                    handleNewStepChange("title", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select
                  value={newStep.status}
                  onChange={(e) =>
                    handleNewStepChange("status", e.target.value)
                  }
                >
                  {STEP_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Début prévu</label>
                <input
                  type="date"
                  value={newStep.planned_start_date}
                  onChange={(e) =>
                    handleNewStepChange("planned_start_date", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Fin prévue</label>
                <input
                  type="date"
                  value={newStep.planned_end_date}
                  onChange={(e) =>
                    handleNewStepChange("planned_end_date", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Visible côté client</label>
                <select
                  value={newStep.client_visible ? "true" : "false"}
                  onChange={(e) =>
                    handleNewStepChange(
                      "client_visible",
                      e.target.value === "true"
                    )
                  }
                >
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </div>

              {needsReason(newStep.status) && (
                <div className="form-group form-group-full">
                  <label>Cause du blocage / retard</label>
                  <textarea
                    rows="3"
                    value={newStep.status_reason}
                    onChange={(e) =>
                      handleNewStepChange("status_reason", e.target.value)
                    }
                  />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleCreateStep}
                disabled={creatingStep}
              >
                {creatingStep ? "Ajout..." : "Créer l’étape"}
              </button>
            </div>
          </div>
        )}

        {!project.steps || project.steps.length === 0 ? (
          <p className="empty">Aucune étape pour ce projet.</p>
        ) : (
          <div className="timeline">
            {project.steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                editedStatus={editedStatuses[step.id] || step.status}
                editedReason={editedReasons[step.id] || ""}
                onStatusChange={handleStatusChange}
                onReasonChange={handleReasonChange}
                onSaveStep={handleSaveStep}
                savingStepId={savingStepId}
                disabled={projectCancelled}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
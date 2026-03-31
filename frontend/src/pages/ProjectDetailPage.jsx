import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";

const STEP_STATUS_OPTIONS = [
  { value: "not_started", label: "Non démarrée" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "delayed", label: "En retard" },
  { value: "blocked", label: "Bloquée" },
];

function getStatusLabel(status) {
  const labels = {
    draft: "Brouillon",
    in_progress: "En cours",
    completed: "Terminé",
    delayed: "En retard",
    blocked: "Bloqué",
    not_started: "Non démarrée",
  };

  return labels[status] || status;
}

function StepCard({
  step,
  editedStatus,
  onStatusChange,
  onSaveStep,
  savingStepId,
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

        <div className="step-actions">
          <select
            value={editedStatus}
            onChange={(e) => onStatusChange(step.id, e.target.value)}
          >
            {STEP_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button onClick={() => onSaveStep(step)} disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [editedStatuses, setEditedStatuses] = useState({});
  const [savingStepId, setSavingStepId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await api.get(`/projects/${id}/`);

      setProject(response.data);

      const initialStatuses = {};
      (response.data.steps || []).forEach((step) => {
        initialStatuses[step.id] = step.status;
      });
      setEditedStatuses(initialStatuses);
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
  };

  const handleSaveStep = async (step) => {
    try {
      setSavingStepId(step.id);
      setError("");
      setSuccessMessage("");

      await api.patch(`/steps/${step.id}/`, {
        status: editedStatuses[step.id],
      });

      await fetchProject();
      setSuccessMessage("Étape mise à jour avec succès.");
    } catch (err) {
      setError("Impossible de mettre à jour l’étape.");
      console.error(err);
    } finally {
      setSavingStepId(null);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Chargement du projet...</p>
      </div>
    );
  }

  if (error) {
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
        <button onClick={fetchProject}>Rafraîchir</button>
      </header>

      {successMessage && <p className="success-message">{successMessage}</p>}

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
          <p>
            <strong>Type :</strong> {project.project_type || "-"}
          </p>
          <p>
            <strong>Statut :</strong> {getStatusLabel(project.status)}
          </p>
          <p>
            <strong>Avancement :</strong> {project.progress_percentage}%
          </p>
          <p>
            <strong>Bloqué :</strong> {project.is_blocked ? "Oui" : "Non"}
          </p>
        </div>

        <div className="summary-card">
          <h3>Client</h3>
          <p>
            <strong>Nom :</strong> {project.client_name || "-"}
          </p>
          <p>
            <strong>Société :</strong> {project.client_company || "-"}
          </p>
          <p>
            <strong>ID client :</strong> {project.client}
          </p>
        </div>

        <div className="summary-card">
          <h3>Dates</h3>
          <p>
            <strong>Début :</strong> {project.start_date || "-"}
          </p>
          <p>
            <strong>Fin prévue :</strong> {project.expected_end_date || "-"}
          </p>
          <p>
            <strong>Fin réelle :</strong> {project.actual_end_date || "-"}
          </p>
        </div>

        <div className="summary-card">
          <h3>Gestion</h3>
          <p>
            <strong>Manager :</strong> {project.project_manager || "-"}
          </p>
          <p>
            <strong>Créé par :</strong> {project.created_by || "-"}
          </p>
        </div>
      </section>

      <section className="panel">
        <h2>Description</h2>
        <p className="project-description">
          {project.description || "Aucune description."}
        </p>
      </section>

      <section className="panel">
        <h2>Timeline des étapes</h2>

        {!project.steps || project.steps.length === 0 ? (
          <p className="empty">Aucune étape pour ce projet.</p>
        ) : (
          <div className="timeline">
            {project.steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                editedStatus={editedStatuses[step.id] || step.status}
                onStatusChange={handleStatusChange}
                onSaveStep={handleSaveStep}
                savingStepId={savingStepId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
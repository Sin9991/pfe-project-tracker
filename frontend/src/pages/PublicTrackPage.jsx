import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

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

function PublicStepCard({ step }) {
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

        {step.status_reason && (
          <div className="status-reason-box">
            <strong>Cause signalée :</strong> {step.status_reason}
          </div>
        )}

        {step.comments?.length > 0 && (
          <div className="public-section">
            <h4>Commentaires</h4>
            <ul className="public-list">
              {step.comments.map((comment) => (
                <li key={comment.id}>
                  <strong>{comment.author_name}</strong> — {comment.content}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step.attachments?.length > 0 && (
          <div className="public-section">
            <h4>Pièces jointes</h4>
            <ul className="public-list">
              {step.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <a href={attachment.file_url} target="_blank" rel="noreferrer">
                    {attachment.file_name || "Fichier"}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicTrackPage() {
  const { token } = useParams();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`/api/public/project/${token}/`);
      setProject(response.data);
    } catch (err) {
      setError("Lien invalide, inactif ou expiré.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [token]);

  if (loading) {
    return (
      <div className="page">
        <p>Chargement du suivi du projet...</p>
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
      <header className="public-header">
        <div>
          <h1>Suivi de projet</h1>
          <p>Consultation client en lecture seule</p>
        </div>
      </header>

      {project.status === "cancelled" && project.cancellation_reason && (
        <section className="panel">
          <h2>Projet annulé</h2>
          <div className="status-reason-box">
            <strong>Cause d’annulation :</strong> {project.cancellation_reason}
          </div>
        </section>
      )}

      <section className="project-summary-grid">
        <div className="summary-card">
          <h3>Projet</h3>
          <p><strong>Titre :</strong> {project.title}</p>
          <p><strong>Type :</strong> {project.project_type || "-"}</p>
          <p><strong>Statut :</strong> {getStatusLabel(project.status)}</p>
          <p><strong>Avancement :</strong> {project.progress_percentage}%</p>
        </div>

        <div className="summary-card">
          <h3>Client</h3>
          <p><strong>Nom :</strong> {project.client_name || "-"}</p>
          <p><strong>Société :</strong> {project.client_company || "-"}</p>
        </div>

        <div className="summary-card">
          <h3>Dates</h3>
          <p><strong>Début :</strong> {project.start_date || "-"}</p>
          <p><strong>Fin prévue :</strong> {project.expected_end_date || "-"}</p>
          <p><strong>Fin réelle :</strong> {project.actual_end_date || "-"}</p>
        </div>
      </section>

      <section className="panel">
        <h2>Description</h2>
        <p className="project-description">
          {project.description || "Aucune description."}
        </p>
      </section>

      <section className="panel">
        <h2>Timeline du projet</h2>

        {!project.steps || project.steps.length === 0 ? (
          <p className="empty">Aucune étape visible.</p>
        ) : (
          <div className="timeline">
            {project.steps.map((step) => (
              <PublicStepCard key={step.id} step={step} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
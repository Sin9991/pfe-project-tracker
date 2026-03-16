import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

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

  return labels[status] || status || "-";
}

function formatProgress(value) {
  if (value === null || value === undefined || value === "") {
    return "0.00%";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `${value}%`;
  }

  return `${numericValue.toFixed(2)}%`;
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

function ProjectTable({ title, projects }) {
  return (
    <div className="panel">
      <h2>{title}</h2>

      {projects.length === 0 ? (
        <p className="empty">Aucune donnée.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Client</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Avancement</th>
              <th>Responsable</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.title || "-"}</td>
                <td>{project.client_name || "-"}</td>
                <td>{project.project_type || "-"}</td>
                <td>
                  <span className={`status-badge status-${project.status}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </td>
                <td>{formatProgress(project.progress_percentage)}</td>
                <td>{project.project_manager_name || "-"}</td>
                <td>
                  <Link to={`/projects/${project.id}`} className="table-link">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await axios.get("/api/dashboard/", {
        withCredentials: true,
      });

      setDashboard(response.data);
    } catch (err) {
      setError(
        "Impossible de charger le dashboard. Vérifie que tu es connecté sur http://localhost:8000/admin/."
      );
      console.error(err.response?.data || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <p>Chargement du dashboard...</p>
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

  if (!dashboard) {
    return (
      <div className="page">
        <p>Aucune donnée disponible.</p>
      </div>
    );
  }

  const stats = dashboard.stats || {};
  const recentProjects = dashboard.recent_projects || [];
  const attentionProjects = dashboard.attention_projects || [];

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Dashboard Admin</h1>
          <p>Suivi des projets techniques</p>
        </div>

        <div className="header-actions">
          <Link to="/projects/new" className="primary-link-button">
            Nouveau projet
          </Link>

          <button
            onClick={() => fetchDashboard({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? "Rafraîchissement..." : "Rafraîchir"}
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard title="Total projets" value={stats.total_projects ?? 0} />
        <StatCard title="Brouillons" value={stats.draft_projects ?? 0} />
        <StatCard title="En cours" value={stats.in_progress_projects ?? 0} />
        <StatCard title="Terminés" value={stats.completed_projects ?? 0} />
        <StatCard title="En retard" value={stats.delayed_projects ?? 0} />
        <StatCard title="Bloqués" value={stats.blocked_projects ?? 0} />
        <StatCard title="Annulés" value={stats.cancelled_projects ?? 0} />
      </section>

      <section className="panels-grid">
        <ProjectTable title="Projets récents" projects={recentProjects} />
        <ProjectTable title="Projets à surveiller" projects={attentionProjects} />
      </section>
    </div>
  );
}
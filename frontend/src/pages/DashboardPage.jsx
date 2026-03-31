import { useEffect, useState } from "react";
import api from "../lib/api";

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
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.title}</td>
                <td>{project.client_name || "-"}</td>
                <td>{project.project_type || "-"}</td>
                <td>{project.status}</td>
                <td>{project.progress_percentage}%</td>
                <td>{project.project_manager_name || "-"}</td>
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
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/dashboard/");

      setDashboard(response.data);
    } catch (err) {
      setError(
        "Impossible de charger le dashboard. Vérifie que tu es connecté sur http://localhost:8000/admin/."
      );
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Dashboard Admin</h1>
          <p>Suivi des projets techniques</p>
        </div>
        <button onClick={fetchDashboard}>Rafraîchir</button>
      </header>

      <section className="stats-grid">
        <StatCard title="Total projets" value={dashboard.stats.total_projects} />
        <StatCard title="Brouillons" value={dashboard.stats.draft_projects} />
        <StatCard title="En cours" value={dashboard.stats.in_progress_projects} />
        <StatCard title="Terminés" value={dashboard.stats.completed_projects} />
        <StatCard title="En retard" value={dashboard.stats.delayed_projects} />
        <StatCard title="Bloqués" value={dashboard.stats.blocked_projects} />
      </section>

      <section className="panels-grid">
        <ProjectTable
          title="Projets récents"
          projects={dashboard.recent_projects}
        />
        <ProjectTable
          title="Projets à surveiller"
          projects={dashboard.attention_projects}
        />
      </section>
    </div>
  );
}
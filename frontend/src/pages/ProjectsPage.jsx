import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/projects/");

      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (err) {
      setError(
        "Impossible de charger les projets. Vérifie que tu es connecté sur http://localhost:8000/admin/."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter((project) => {
      return (
        project.title?.toLowerCase().includes(value) ||
        project.client_name?.toLowerCase().includes(value) ||
        project.project_type?.toLowerCase().includes(value) ||
        project.status?.toLowerCase().includes(value) ||
        project.project_manager_name?.toLowerCase().includes(value)
      );
    });

    setFilteredProjects(filtered);
  }, [search, projects]);

  if (loading) {
    return (
      <div className="page">
        <p>Chargement des projets...</p>
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
          <h1>Liste des projets</h1>
          <p>Vue d’ensemble de tous les projets</p>
        </div>

        <div className="header-actions">
          <Link to="/projects/new" className="primary-link-button">
            Nouveau projet
          </Link>
          <button onClick={fetchProjects}>Rafraîchir</button>
        </div>
      </header>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Rechercher par titre, client, type, statut..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="panel">
        {filteredProjects.length === 0 ? (
          <p className="empty">Aucun projet trouvé.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Client</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Avancement</th>
                <th>Responsable</th>
                <th>Début</th>
                <th>Fin prévue</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td>{project.id}</td>
                  <td>{project.title}</td>
                  <td>{project.client_name || "-"}</td>
                  <td>{project.project_type || "-"}</td>
                  <td>{project.status}</td>
                  <td>{project.progress_percentage}%</td>
                  <td>{project.project_manager_name || "-"}</td>
                  <td>{project.start_date || "-"}</td>
                  <td>{project.expected_end_date || "-"}</td>
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
    </div>
  );
}
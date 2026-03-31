import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function CreateProjectPage() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    client: "",
    project_manager: "",
    title: "",
    description: "",
    project_type: "",
    start_date: "",
    expected_end_date: "",
  });

  const fetchReferences = async () => {
    try {
      setLoadingRefs(true);
      setError("");

      const [clientsResponse, usersResponse] = await Promise.all([
        api.get("/clients/"),
        api.get("/users/"),
      ]);

      setClients(clientsResponse.data);
      setUsers(usersResponse.data);
    } catch (err) {
      setError(
        "Impossible de charger les clients ou les utilisateurs. Vérifie que tu es connecté sur http://localhost:8000/admin/."
      );
      console.error(err);
    } finally {
      setLoadingRefs(false);
    }
  };

  useEffect(() => {
    fetchReferences();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        client: Number(formData.client),
        project_manager: formData.project_manager
          ? Number(formData.project_manager)
          : null,
        title: formData.title,
        description: formData.description,
        project_type: formData.project_type,
        start_date: formData.start_date || null,
        expected_end_date: formData.expected_end_date || null,
      };

      const response = await api.post("/projects/", payload);

      navigate(`/projects/${response.data.id}`);
    } catch (err) {
      setError("Impossible de créer le projet.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loadingRefs) {
    return (
      <div className="page">
        <p>Chargement du formulaire...</p>
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
          <h1>Créer un projet</h1>
          <p>Ajout d’un nouveau projet technique</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <form className="project-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Client</label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Responsable projet</label>
              <select
                name="project_manager"
                value={formData.project_manager}
                onChange={handleChange}
              >
                <option value="">Sélectionner un responsable</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Titre</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Type de projet</label>
              <input
                type="text"
                name="project_type"
                value={formData.project_type}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Date de début</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Date de fin prévue</label>
              <input
                type="date"
                name="expected_end_date"
                value={formData.expected_end_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group form-group-full">
              <label>Description</label>
              <textarea
                name="description"
                rows="5"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer le projet"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

function isAdminLike(user) {
  return Boolean(user && (user.is_superuser || user.role === "admin"));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

export default function ClientsPage({ currentUser }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canWriteClients = isAdminLike(currentUser);

  const fetchClients = async (query = "") => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (query.trim()) params.q = query.trim();

      const response = await api.get("/clients/", { params });

      setClients(response.data || []);
    } catch (err) {
      setError("Impossible de charger les clients.");
      console.error(err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchClients(search);
  };

  const handleReset = () => {
    setSearch("");
    fetchClients("");
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Clients</h1>
          <p>Gestion du référentiel des clients</p>
        </div>

        <div className="header-actions">
          <button onClick={() => fetchClients(search)}>Rafraîchir</button>
          {canWriteClients && (
            <Link to="/clients/new" className="primary-link-button">
              Nouveau client
            </Link>
          )}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Recherche</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group form-group-full">
            <label>Recherche</label>
            <input
              type="text"
              placeholder="Nom, société, email, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-actions form-group-full">
            <button type="submit">Rechercher</button>
            <button type="button" onClick={handleReset}>
              Réinitialiser
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header-row">
          <h2>Liste des clients</h2>
          <span>{clients.length} client(s)</span>
        </div>

        {loading ? (
          <p>Chargement...</p>
        ) : clients.length === 0 ? (
          <p className="empty">Aucun client trouvé.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Société</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Créé le</th>
                  {canWriteClients && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name || "-"}</td>
                    <td>{client.company || "-"}</td>
                    <td>{client.email || "-"}</td>
                    <td>{client.phone || "-"}</td>
                    <td>{formatDate(client.created_at)}</td>
                    {canWriteClients && (
                      <td>
                        <Link to={`/clients/${client.id}/edit`} className="table-link">
                          Modifier
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

function getRoleLabel(role) {
  const labels = {
    admin: "Admin",
    manager: "Gestionnaire",
    viewer: "Lecture seule",
  };
  return labels[role] || role || "-";
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/users/");
      setUsers(response.data || []);
    } catch (err) {
      setError("Impossible de charger les utilisateurs.");
      console.error(err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Utilisateurs</h1>
          <p>Gestion des comptes internes</p>
        </div>

        <div className="header-actions">
          <button onClick={fetchUsers}>Rafraîchir</button>
          <Link to="/users/new" className="primary-link-button">
            Nouvel utilisateur
          </Link>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        {loading ? (
          <p>Chargement...</p>
        ) : users.length === 0 ? (
          <p className="empty">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Actif</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.username}</td>
                    <td>{item.label || "-"}</td>
                    <td>{item.email || "-"}</td>
                    <td>{getRoleLabel(item.role)}</td>
                    <td>{item.is_active ? "Oui" : "Non"}</td>
                    <td>
                      <Link to={`/users/${item.id}/edit`} className="table-link">
                        Modifier
                      </Link>
                    </td>
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
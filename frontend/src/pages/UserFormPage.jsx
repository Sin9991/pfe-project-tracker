import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";

function parseApiError(err, fallback) {
  const data = err.response?.data;

  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  if (typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(", ")}`;
        }
        return `${key}: ${value}`;
      })
      .join(" | ");
  }

  return fallback;
}

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    is_active: true,
    role: "viewer",
  });

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditMode) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/admin/users/${id}/`);

        setFormData({
          username: response.data.username || "",
          email: response.data.email || "",
          first_name: response.data.first_name || "",
          last_name: response.data.last_name || "",
          password: "",
          is_active: Boolean(response.data.is_active),
          role: response.data.role || "viewer",
        });
      } catch (err) {
        setError("Impossible de charger l’utilisateur.");
        console.error(err.response?.data || err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, isEditMode]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        is_active: formData.is_active,
        role: formData.role,
      };

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      if (isEditMode) {
        await api.patch(`/admin/users/${id}/`, payload);
      } else {
        await api.post("/admin/users/", payload);
      }

      navigate("/users");
    } catch (err) {
      setError(parseApiError(err, "Impossible d’enregistrer l’utilisateur."));
      console.error(err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cet utilisateur ?"
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(`/admin/users/${id}/`);
      navigate("/users");
    } catch (err) {
      setError(parseApiError(err, "Impossible de supprimer l’utilisateur."));
      console.error(err.response?.data || err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Chargement de l’utilisateur...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <Link to="/users" className="back-link">
            ← Retour à la liste des utilisateurs
          </Link>
          <h1>{isEditMode ? "Modifier l’utilisateur" : "Créer un utilisateur"}</h1>
          <p>Gestion des comptes internes</p>
        </div>

        {isEditMode && (
          <div className="header-actions">
            <button
              className="danger-button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        )}
      </header>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Nom d’utilisateur</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Prénom</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Nom</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Mot de passe {isEditMode ? "(laisser vide pour ne pas changer)" : ""}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required={!isEditMode}
            />
          </div>

          <div className="form-group">
            <label>Rôle</label>
            <select
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Gestionnaire</option>
              <option value="viewer">Lecture seule</option>
            </select>
          </div>

          <div className="form-group form-group-full">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
              <span>Compte actif</span>
            </label>
          </div>

          <div className="form-actions form-group-full">
            <button type="submit" disabled={saving}>
              {saving
                ? "Enregistrement..."
                : isEditMode
                ? "Enregistrer les modifications"
                : "Créer l’utilisateur"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
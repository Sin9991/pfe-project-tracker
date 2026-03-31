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

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isEditMode) return;

    const fetchClient = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/clients/${id}/`);

        setFormData({
          name: response.data.name || "",
          company: response.data.company || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
          address: response.data.address || "",
          notes: response.data.notes || "",
        });
      } catch (err) {
        setError("Impossible de charger le client.");
        console.error(err.response?.data || err);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
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
      setSuccessMessage("");

      const payload = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
      };

      if (isEditMode) {
        await api.patch(`/clients/${id}/`, payload);
        setSuccessMessage("Client modifié avec succès.");
      } else {
        await api.post("/clients/", payload);
        navigate("/clients");
      }
    } catch (err) {
      console.error(err.response?.data || err);
      setError(
        parseApiError(
          err,
          isEditMode
            ? "Impossible de modifier le client."
            : "Impossible de créer le client."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce client ?"
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setSuccessMessage("");

      await api.delete(`/clients/${id}/`);

      navigate("/clients");
    } catch (err) {
      console.error(err.response?.data || err);
      setError(parseApiError(err, "Impossible de supprimer le client."));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Chargement du client...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <Link to="/clients" className="back-link">
            ← Retour à la liste des clients
          </Link>
          <h1>{isEditMode ? "Modifier le client" : "Créer un client"}</h1>
          <p>Gestion des informations client</p>
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
      {successMessage && <p className="success-message">{successMessage}</p>}

      <section className="panel">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Société</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange("company", e.target.value)}
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
            <label>Téléphone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div className="form-group form-group-full">
            <label>Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          <div className="form-group form-group-full">
            <label>Notes</label>
            <textarea
              rows="5"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>

          <div className="form-actions form-group-full">
            <button type="submit" disabled={saving}>
              {saving
                ? "Enregistrement..."
                : isEditMode
                ? "Enregistrer les modifications"
                : "Créer le client"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
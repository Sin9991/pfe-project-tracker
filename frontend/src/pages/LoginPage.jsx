import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../lib/api";

export default function LoginPage({ user, onLogin }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/csrf/").catch((err) => {
      console.error("Erreur CSRF :", err.response?.data || err);
    });
  }, []);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await api.get("/auth/csrf/");

      const response = await api.post("/auth/login/", {
        username: formData.username,
        password: formData.password,
      });

      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de se connecter.");
      console.error(err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <section className="panel auth-panel">
        <h1>Connexion</h1>
        <p>Accès à la plateforme interne de suivi de projets</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group form-group-full">
            <label>Nom d’utilisateur</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
              required
            />
          </div>

          <div className="form-group form-group-full">
            <label>Mot de passe</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />
          </div>

          <div className="form-actions form-group-full">
            <button type="submit" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
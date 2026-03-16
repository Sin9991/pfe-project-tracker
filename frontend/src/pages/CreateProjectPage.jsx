import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return null;
}

const STEP_STATUS_OPTIONS = [
  { value: "not_started", label: "Non démarrée" },
  { value: "in_progress", label: "En cours" },
  { value: "completed", label: "Terminée" },
  { value: "delayed", label: "En retard" },
  { value: "blocked", label: "Bloquée" },
];

function needsReason(status) {
  return status === "blocked" || status === "delayed";
}

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
    steps: [
      {
        title: "",
        step_order: 1,
        status: "not_started",
        status_reason: "",
        planned_start_date: "",
        planned_end_date: "",
        client_visible: true,
      },
    ],
  });

  const fetchReferences = async () => {
    try {
      setLoadingRefs(true);
      setError("");

      const [clientsResponse, usersResponse] = await Promise.all([
        axios.get("/api/clients/", { withCredentials: true }),
        axios.get("/api/users/", { withCredentials: true }),
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

  const handleStepChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedSteps = [...prev.steps];
      const updatedStep = {
        ...updatedSteps[index],
        [field]: value,
      };

      if (field === "status" && !needsReason(value)) {
        updatedStep.status_reason = "";
      }

      updatedSteps[index] = updatedStep;

      return {
        ...prev,
        steps: updatedSteps,
      };
    });
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          title: "",
          step_order: prev.steps.length + 1,
          status: "not_started",
          status_reason: "",
          planned_start_date: "",
          planned_end_date: "",
          client_visible: true,
        },
      ],
    }));
  };

  const removeStep = (index) => {
    setFormData((prev) => {
      const updatedSteps = prev.steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({
          ...step,
          step_order: i + 1,
        }));

      return {
        ...prev,
        steps: updatedSteps.length
          ? updatedSteps
          : [
              {
                title: "",
                step_order: 1,
                status: "not_started",
                status_reason: "",
                planned_start_date: "",
                planned_end_date: "",
                client_visible: true,
              },
            ],
      };
    });
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
        steps: formData.steps.map((step, index) => ({
          title: step.title,
          description: "",
          step_order: index + 1,
          status: step.status || "not_started",
          status_reason: step.status_reason || "",
          planned_start_date: step.planned_start_date || null,
          planned_end_date: step.planned_end_date || null,
          actual_start_date: null,
          actual_end_date: null,
          client_visible: step.client_visible,
        })),
      };

      const response = await axios.post("/api/projects/", payload, {
        withCredentials: true,
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });

      navigate(`/projects/${response.data.id}`);
    } catch (err) {
      console.error(err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Impossible de créer le projet."
      );
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

          <section className="steps-builder">
            <div className="steps-builder-header">
              <h2>Timeline des étapes</h2>
              <button type="button" onClick={addStep}>
                Ajouter une étape
              </button>
            </div>

            {formData.steps.map((step, index) => (
              <div key={index} className="step-builder-card">
                <div className="step-builder-top">
                  <h3>Étape {index + 1}</h3>
                  <button type="button" onClick={() => removeStep(index)}>
                    Supprimer
                  </button>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Titre de l’étape</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) =>
                        handleStepChange(index, "title", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Statut</label>
                    <select
                      value={step.status}
                      onChange={(e) =>
                        handleStepChange(index, "status", e.target.value)
                      }
                    >
                      {STEP_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Début prévu</label>
                    <input
                      type="date"
                      value={step.planned_start_date}
                      onChange={(e) =>
                        handleStepChange(index, "planned_start_date", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Fin prévue</label>
                    <input
                      type="date"
                      value={step.planned_end_date}
                      onChange={(e) =>
                        handleStepChange(index, "planned_end_date", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Visible côté client</label>
                    <select
                      value={step.client_visible ? "true" : "false"}
                      onChange={(e) =>
                        handleStepChange(
                          index,
                          "client_visible",
                          e.target.value === "true"
                        )
                      }
                    >
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </select>
                  </div>

                  {needsReason(step.status) && (
                    <div className="form-group form-group-full">
                      <label>Cause du blocage / retard</label>
                      <textarea
                        rows="3"
                        value={step.status_reason}
                        onChange={(e) =>
                          handleStepChange(index, "status_reason", e.target.value)
                        }
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>

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
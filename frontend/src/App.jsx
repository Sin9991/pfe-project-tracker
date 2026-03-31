import { useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import api from "./lib/api";

import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ClientsPage from "./pages/ClientsPage";
import ClientFormPage from "./pages/ClientFormPage";
import PublicTrackPage from "./pages/PublicTrackPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import UserFormPage from "./pages/UserFormPage";
import "./App.css";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return null;
}

function isAdminLike(user) {
  return Boolean(user && (user.is_superuser || user.role === "admin"));
}

function isProjectWriter(user) {
  return Boolean(
    user &&
      (user.is_superuser || user.role === "admin" || user.role === "manager")
  );
}

function canManageUsers(user) {
  return Boolean(user && user.is_superuser);
}

function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="page">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function SuperuserRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="page">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_superuser) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ClientWriteRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="page">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminLike(user)) {
    return <Navigate to="/clients" replace />;
  }

  return children;
}

function ProjectWriteRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="page">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isProjectWriter(user)) {
    return <Navigate to="/projects" replace />;
  }

  return children;
}

function getRoleLabel(user) {
  if (!user) return "";
  if (user.is_superuser) return "Superadmin";

  const map = {
    admin: "Admin",
    manager: "Gestionnaire",
    viewer: "Lecture seule",
  };

  return map[user.role] || user.role || "";
}

function AppNavigation({ user, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-block">
          <div className="brand-logo">PT</div>
          <div className="brand-text">
            <strong>Project Tracker</strong>
            <span>Plateforme interne</span>
          </div>
        </div>

        <nav className="app-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projets</NavLink>
          <NavLink to="/clients">Clients</NavLink>
          {canManageUsers(user) && <NavLink to="/users">Utilisateurs</NavLink>}
        </nav>
      </div>

      <div className="topbar-right">
        <div className="user-chip">
          <div className="user-chip-main">
            <strong>{user.label || user.username}</strong>
            <span>{user.email || user.username}</span>
          </div>
          <span className="role-badge">{getRoleLabel(user)}</span>
        </div>

        <button type="button" className="nav-logout-button" onClick={onLogout}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchMe = async () => {
    try {
      setAuthLoading(true);

      const response = await api.get("/auth/me/");

      if (response.data?.authenticated) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (_err) {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
  };

 const handleLogout = async () => {
  try {
    await api.get("/auth/csrf/");
    await api.post("/auth/logout/", {});
  } catch (err) {
    console.error(err.response?.data || err);
  } finally {
    setUser(null);
  }
};

  return (
    <BrowserRouter>
      {user && <AppNavigation user={user} onLogout={handleLogout} />}

      <Routes>
        <Route
          path="/login"
          element={<LoginPage user={user} onLogin={handleLogin} />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <DashboardPage currentUser={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <ProjectsPage currentUser={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/new"
          element={
            <ProjectWriteRoute user={user} loading={authLoading}>
              <CreateProjectPage currentUser={user} />
            </ProjectWriteRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <ProjectDetailPage currentUser={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute user={user} loading={authLoading}>
              <ClientsPage currentUser={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/new"
          element={
            <ClientWriteRoute user={user} loading={authLoading}>
              <ClientFormPage currentUser={user} />
            </ClientWriteRoute>
          }
        />

        <Route
          path="/clients/:id/edit"
          element={
            <ClientWriteRoute user={user} loading={authLoading}>
              <ClientFormPage currentUser={user} />
            </ClientWriteRoute>
          }
        />

        <Route
          path="/users"
          element={
            <SuperuserRoute user={user} loading={authLoading}>
              <UsersPage />
            </SuperuserRoute>
          }
        />

        <Route
          path="/users/new"
          element={
            <SuperuserRoute user={user} loading={authLoading}>
              <UserFormPage />
            </SuperuserRoute>
          }
        />

        <Route
          path="/users/:id/edit"
          element={
            <SuperuserRoute user={user} loading={authLoading}>
              <UserFormPage />
            </SuperuserRoute>
          }
        />

        <Route path="/track/:token" element={<PublicTrackPage />} />
      </Routes>
    </BrowserRouter>
  );
}
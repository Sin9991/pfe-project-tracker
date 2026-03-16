import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import CreateProjectPage from "./pages/CreateProjectPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import PublicTrackPage from "./pages/PublicTrackPage";
import "./index.css";

function AdminLayout({ children }) {
  return (
    <>
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="brand">PFE Suivi Projets</div>
          <div className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/projects">Projets</Link>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/track/:token" element={<PublicTrackPage />} />

        <Route
          path="/"
          element={
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          }
        />
        <Route
          path="/projects"
          element={
            <AdminLayout>
              <ProjectsPage />
            </AdminLayout>
          }
        />
        <Route
          path="/projects/new"
          element={
            <AdminLayout>
              <CreateProjectPage />
            </AdminLayout>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <AdminLayout>
              <ProjectDetailPage />
            </AdminLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
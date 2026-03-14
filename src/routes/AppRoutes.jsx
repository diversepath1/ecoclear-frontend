import { Navigate, Route, Routes } from "react-router-dom";
import { getRouteForRole, useAuth } from "../context/AuthContext";
import LandingPage from "../pages/LandingPage";
import AdminDashboard from "../pages/AdminDashboard";
import LoginPage from "../pages/LoginPage";
import MoMDashboard from "../pages/MoMDashboard";
import ProponentDashboard from "../pages/ProponentDashboard";
import ScrutinyDashboard from "../pages/ScrutinyDashboard";
import SignupPage from "../pages/SignupPage";

function RouteLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6] px-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm">
        Loading session...
      </div>
    </div>
  );
}

function PublicOnlyRoute({ children }) {
  const { loading, isAuthenticated, role } = useAuth();

  if (loading) return <RouteLoadingState />;
  if (isAuthenticated) return <Navigate to={getRouteForRole(role)} replace />;

  return children;
}

function ProtectedRoute({ children, allowedRoles }) {
  const { loading, isAuthenticated, role } = useAuth();

  if (loading) return <RouteLoadingState />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles?.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getRouteForRole(role)} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/admin-dashboard/*"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mom-dashboard/*"
        element={
          <ProtectedRoute allowedRoles={["mom_team"]}>
            <MoMDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proponent-dashboard/*"
        element={
          <ProtectedRoute allowedRoles={["proponent"]}>
            <ProponentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scrutiny-dashboard/*"
        element={
          <ProtectedRoute allowedRoles={["scrutiny_team"]}>
            <ScrutinyDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;

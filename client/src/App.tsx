import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import Landing from "./views/Landing";
import Register from "./views/Register";
import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import DashboardManager from "./views/DashboardManager";
import DashboardTenant from "./views/DashboardTenant";

type User = {
  id: number;
  name: string;
  email: string;
  date_of_birth?: string | null;
  role?: "admin" | "manager" | "tenant" | string;
  status?: string;
};

function safeParseUser(raw: string | null): User | null {
  if (!raw) return null;
  if (raw === "undefined" || raw === "null") return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem("ts_user");
    return null;
  }
}

function getCurrentUser(): User | null {
  return safeParseUser(localStorage.getItem("ts_user"));
}

function getDashboardPath(role?: string) {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "manager":
      return "/dashboard-manager";
    case "tenant":
      return "/dashboard-tenant";
    default:
      return "/login";
  }
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactElement;
  allowedRoles: string[];
}) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const user = getCurrentUser();

  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard-manager"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <DashboardManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard-tenant"
          element={
            <ProtectedRoute allowedRoles={["tenant"]}>
              <DashboardTenant />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
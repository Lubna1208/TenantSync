import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactElement } from "react";
import Landing from "./views/Landing";
import Register from "./views/Register";
import Login from "./views/Login";
import Dashboard from "./views/Dashboard";
import DashboardManager from "./views/DashboardManager";
import DashboardTenant from "./views/DashboardTenant";

const API = "http://localhost:8000/api";

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
  authChecked,
}: {
  children: ReactElement;
  allowedRoles: string[];
  authChecked: boolean;
}) {
  if (!authChecked) return null;

  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}

function PublicOnlyRoute({
  children,
  authChecked,
}: {
  children: ReactElement;
  authChecked: boolean;
}) {
  if (!authChecked) return null;

  const user = getCurrentUser();

  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return children;
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API}/auth/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          localStorage.removeItem("ts_user");
          sessionStorage.removeItem("ts_user");
          return;
        }

        const user = await res.json();

        if (!user?.id) {
          localStorage.removeItem("ts_user");
          sessionStorage.removeItem("ts_user");
          return;
        }

        localStorage.setItem("ts_user", JSON.stringify(user));
      } catch {
        localStorage.removeItem("ts_user");
        sessionStorage.removeItem("ts_user");
      } finally {
        setAuthChecked(true);
      }
    }

    void checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/register"
          element={
            <PublicOnlyRoute authChecked={authChecked}>
              <Register />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/login"
          element={
            <PublicOnlyRoute authChecked={authChecked}>
              <Login />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]} authChecked={authChecked}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard-manager"
          element={
            <ProtectedRoute
              allowedRoles={["manager"]}
              authChecked={authChecked}
            >
              <DashboardManager />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard-tenant"
          element={
            <ProtectedRoute
              allowedRoles={["tenant"]}
              authChecked={authChecked}
            >
              <DashboardTenant />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, type ReactElement } from "react";
import Landing from "./views/Landing";
import Dashboard from "./views/Dashboard";
import DashboardManager from "./views/DashboardManager";
import DashboardTenant from "./views/DashboardTenant";
import AcceptTenantInvitation from "./views/AcceptTenantInvitation";
import ManagerSendInvitation from "./views/ManagerSendInvitation";
import ManagerAddUnitDetails from "./views/ManagerAddUnitDetails";
import OwnerCreateProperty from "./views/OwnerCreateProperty";
import OwnerCreateManager from "./views/OwnerCreateManager";
import { authFetch, clearStoredAuth } from "./helpers/authApi";

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

function persistAuth(user: User, token?: string | null) {
  localStorage.setItem("ts_user", JSON.stringify(user));

  if (typeof token === "string" && token) {
    localStorage.setItem("ts_token", token);
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

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        let res = await authFetch("/auth/me", {
          method: "GET",
          cache: "no-store",
        });
        let user = await res.json().catch(() => null);

        if (!res.ok || !user?.id) {
          const refreshRes = await authFetch("/auth/refresh", {
            method: "POST",
          });
          const refreshData = await refreshRes.json().catch(() => null);

          if (refreshRes.ok && refreshData?.user?.id) {
            persistAuth(refreshData.user, refreshData.token);
            return;
          }

          if (typeof refreshData?.token === "string" && refreshData.token) {
            localStorage.setItem("ts_token", refreshData.token);
          }

          res = await authFetch("/auth/me", {
            method: "GET",
            cache: "no-store",
          });
          user = await res.json().catch(() => null);
        }

        if (!res.ok || !user?.id) {
          clearStoredAuth();
          return;
        }

        persistAuth(user);
      } catch {
        clearStoredAuth();
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
          path="/login"
          element={<Landing />}
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
          path="/dashboard/properties/new"
          element={
            <ProtectedRoute allowedRoles={["admin"]} authChecked={authChecked}>
              <OwnerCreateProperty />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/managers/new"
          element={
            <ProtectedRoute allowedRoles={["admin"]} authChecked={authChecked}>
              <OwnerCreateManager />
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
          path="/dashboard-manager/invite"
          element={
            <ProtectedRoute
              allowedRoles={["manager"]}
              authChecked={authChecked}
            >
              <ManagerSendInvitation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard-manager/units/new"
          element={
            <ProtectedRoute
              allowedRoles={["manager"]}
              authChecked={authChecked}
            >
              <ManagerAddUnitDetails />
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

        <Route path="/invite/:token" element={<AcceptTenantInvitation />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

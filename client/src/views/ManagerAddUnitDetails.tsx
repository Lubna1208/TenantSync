import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import ManagerHeaderPolished from "../components/manager/ManagerHeaderPolished";
import { authFetch, clearStoredAuth } from "../helpers/authApi";

import "../styles/managerDashboard.css";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

type Unit = {
  id: number;
  unit_number: string;
  status: "vacant" | "occupied";
};

type Property = {
  id: number;
  name: string;
  address: string;
  units?: Unit[];
};

type DashboardResponse = {
  property: Property;
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

function getFirstValidationError(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;

  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }

  return null;
}

function getFailureMessage(
  data: { message?: string; errors?: unknown } | null,
  fallback: string
) {
  const firstValidationError = getFirstValidationError(data?.errors);
  const message = data?.message?.trim();

  if (
    message &&
    message.toLowerCase() !== "validation failed" &&
    message.toLowerCase() !== "validation failed."
  ) {
    return message;
  }

  if (firstValidationError) return firstValidationError;

  return message || fallback;
}

export default function ManagerAddUnitDetails() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [unitForm, setUnitForm] = useState({
    unit_number: "",
    floor: "",
    rent_amount: "",
    status: "vacant" as "vacant" | "occupied",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const property = dashboard?.property ?? null;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    void loadDashboard();
  }, [user, navigate]);

  useEffect(() => {
    if (!message && !error) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [message, error]);

  async function loadDashboard() {
    setLoading(true);

    try {
      const res = await authFetch("/manager/dashboard", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        clearStoredAuth();
        setUser(null);
        navigate("/login");
        return;
      }

      if (!res.ok) {
        setError(data?.message ?? "Manager dashboard could not be loaded.");
        setDashboard(null);
        return;
      }

      setDashboard(data?.data ?? null);
      if (data?.data === null) {
        setMessage(data?.message ?? "No property is assigned to this manager yet.");
      }
    } catch {
      setError("Network error while loading manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await authFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }

    clearStoredAuth();
    setUser(null);
    navigate("/login");
  }

  async function createUnit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await authFetch("/manager/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...unitForm,
          rent_amount: Number(unitForm.rent_amount),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getFailureMessage(data, "Unit creation failed."));
        return;
      }

      setUnitForm({
        unit_number: "",
        floor: "",
        rent_amount: "",
        status: "vacant",
      });

      setMessage(data?.message ?? "Unit created successfully.");
      await loadDashboard();
    } catch {
      setError("Network error while creating unit.");
    }
  }

  if (!user) return null;

  const noticeText = error || message;
  const noticeTone = error ? "error" : "success";

  return (
    <div className="manager-dashboard">
      <div className="dashboard-container">
        <ManagerHeaderPolished
          user={{
            name: user.name || "Manager",
            email: user.email || "manager@tenantsync.com",
          }}
          onLogout={logout}
        />

        <div className="manager-actions-header" style={{ marginBottom: 22 }}>
          <div className="manager-actions-badge">Manager Actions</div>
          <h3>Add Unit Details</h3>
          <p>Create a new unit with rent and occupancy details.</p>
          <div className="manager-actions-shortcuts">
            <button
              type="button"
              className="manager-overview-action-btn"
              onClick={() => navigate("/dashboard-manager")}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              className="manager-overview-action-btn"
              onClick={() => navigate("/dashboard-manager/invite")}
            >
              Send Tenant Invitation
            </button>
          </div>
        </div>

        {noticeText ? (
          <div className={`manager-alert manager-section-alert ${noticeTone}`}>
            {noticeText}
          </div>
        ) : null}

        <form className="dashboard-panel dashboard-side-panel manager-form" onSubmit={createUnit}>
          {loading ? (
            <p className="empty-text">Loading assigned property...</p>
          ) : !property ? (
            <p className="empty-text">No property assigned yet. Ask the owner to assign a property.</p>
          ) : null}

          <input
            className="manager-input"
            placeholder="Unit number"
            value={unitForm.unit_number}
            onChange={(e) =>
              setUnitForm((current) => ({
                ...current,
                unit_number: e.target.value,
              }))
            }
            disabled={!property}
          />

          <input
            className="manager-input"
            placeholder="Floor"
            value={unitForm.floor}
            onChange={(e) =>
              setUnitForm((current) => ({
                ...current,
                floor: e.target.value,
              }))
            }
            disabled={!property}
          />

          <input
            className="manager-input manager-number-input"
            type="number"
            min="0"
            placeholder="Rent amount"
            value={unitForm.rent_amount}
            onChange={(e) =>
              setUnitForm((current) => ({
                ...current,
                rent_amount: e.target.value,
              }))
            }
            disabled={!property}
          />

          <select
            className="manager-input manager-select-input"
            value={unitForm.status}
            onChange={(e) =>
              setUnitForm((current) => ({
                ...current,
                status: e.target.value as "vacant" | "occupied",
              }))
            }
            disabled={!property}
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>

          <button className="action-btn" type="submit" disabled={!property}>
            Save Unit
          </button>
        </form>
      </div>
    </div>
  );
}

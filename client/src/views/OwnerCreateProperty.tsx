import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { authFetch, clearStoredAuth } from "../helpers/authApi";

import "../styles/managerDashboard.css";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

type Manager = {
  id: number;
  name: string;
  email: string;
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

export default function OwnerCreateProperty() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    address: "",
    total_units: "",
    manager_id: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadManagers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await authFetch("/owner/managers", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        clearStoredAuth();
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        setError(data?.message ?? "Managers could not be loaded.");
        setManagers([]);
        return;
      }

      setManagers((data?.data as Manager[] | undefined) ?? []);
    } catch {
      setError("Network error while loading managers.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    void loadManagers();
  }, [user, navigate, loadManagers]);

  useEffect(() => {
    if (!message && !error) return;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [message, error]);

  async function logout() {
    try {
      await authFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }

    clearStoredAuth();
    setUser(null);
    navigate("/login", { replace: true });
  }

  async function createProperty(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await authFetch("/owner/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...propertyForm,
          total_units: Number(propertyForm.total_units),
          manager_id: propertyForm.manager_id ? Number(propertyForm.manager_id) : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getFailureMessage(data, "Property creation failed."));
        return;
      }

      setPropertyForm({
        name: "",
        address: "",
        total_units: "",
        manager_id: "",
      });
      setMessage(data?.message ?? "Property created successfully.");
    } catch {
      setError("Network error while creating property.");
    }
  }

  if (!user) return null;

  const noticeText = error || message;
  const noticeTone = error ? "error" : "success";

  return (
    <div className="manager-dashboard">
      <div className="dashboard-container">
        <div className="manager-header">
          <div className="manager-header-copy">
            <div className="manager-console-badge">Owner Console</div>
            <h2>Create a property</h2>
            <p>Add a building first, then optionally assign a manager now or later.</p>
          </div>

          <div className="manager-header-profile">
            <div className="manager-header-user">
              <div className="manager-header-user-name">{user.name || "Owner"}</div>
              <div className="manager-header-user-email">{user.email || "owner@tenantsync.com"}</div>
            </div>
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="manager-actions-header" style={{ marginBottom: 22 }}>
          <div className="manager-actions-badge">Management</div>
          <h3>Create Property</h3>
          <p>Fill up the information and save a new property.</p>
          <div className="manager-actions-shortcuts">
            <button
              type="button"
              className="manager-overview-action-btn"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              className="manager-overview-action-btn"
              onClick={() => navigate("/dashboard/managers/new")}
            >
              Create Manager
            </button>
          </div>
        </div>

        {noticeText ? (
          <div className={`manager-alert manager-section-alert ${noticeTone}`}>
            {noticeText}
          </div>
        ) : null}

        <form className="dashboard-panel dashboard-side-panel manager-form" onSubmit={createProperty}>
          {loading ? <p className="empty-text">Loading managers...</p> : null}

          <label className="manager-field-group">
            <span className="manager-form-label">Property Name</span>
            <input
              className="manager-input"
              placeholder="Enter property name"
              value={propertyForm.name}
              onChange={(e) =>
                setPropertyForm((current) => ({ ...current, name: e.target.value }))
              }
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Property Address</span>
            <input
              className="manager-input"
              placeholder="Enter property address"
              value={propertyForm.address}
              onChange={(e) =>
                setPropertyForm((current) => ({
                  ...current,
                  address: e.target.value,
                }))
              }
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Total Units</span>
            <input
              className="manager-input manager-number-input"
              type="number"
              min="1"
              placeholder="Enter total units"
              value={propertyForm.total_units}
              onChange={(e) =>
                setPropertyForm((current) => ({
                  ...current,
                  total_units: e.target.value,
                }))
              }
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Assign Manager</span>
            <select
              className="manager-input manager-select-input"
              value={propertyForm.manager_id}
              onChange={(e) =>
                setPropertyForm((current) => ({
                  ...current,
                  manager_id: e.target.value,
                }))
              }
            >
              <option value="">Assign manager later</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </label>

          <button className="action-btn" type="submit">
            Save Property
          </button>
        </form>
      </div>
    </div>
  );
}


import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { authFetch, clearStoredAuth } from "../helpers/authApi";

import "../styles/managerDashboard.css";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
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

export default function OwnerCreateManager() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [managerForm, setManagerForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

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

  async function createManager(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await authFetch("/owner/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(managerForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getFailureMessage(data, "Manager creation failed."));
        return;
      }

      setManagerForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
      });
      setMessage(data?.message ?? "Manager created successfully.");
    } catch {
      setError("Network error while creating manager.");
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
            <h2>Create a manager</h2>
            <p>Create a manager account with initial credentials.</p>
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
          <h3>Create Manager</h3>
          <p>Fill up the information and save a new manager account.</p>
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
              onClick={() => navigate("/dashboard/properties/new")}
            >
              Create Property
            </button>
          </div>
        </div>

        {noticeText ? (
          <div className={`manager-alert manager-section-alert ${noticeTone}`}>
            {noticeText}
          </div>
        ) : null}

        <form className="dashboard-panel dashboard-side-panel manager-form" onSubmit={createManager}>
          <label className="manager-field-group">
            <span className="manager-form-label">Manager Name</span>
            <input
              className="manager-input"
              placeholder="Enter manager name"
              value={managerForm.name}
              onChange={(e) =>
                setManagerForm((current) => ({ ...current, name: e.target.value }))
              }
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Manager Email</span>
            <input
              className="manager-input"
              type="email"
              placeholder="Enter manager email"
              value={managerForm.email}
              onChange={(e) =>
                setManagerForm((current) => ({ ...current, email: e.target.value }))
              }
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Password</span>
            <input
              className="manager-input"
              type="password"
              placeholder="Enter password"
              value={managerForm.password}
              onChange={(e) =>
                setManagerForm((current) => ({ ...current, password: e.target.value }))
              }
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Confirm Password</span>
            <input
              className="manager-input"
              type="password"
              placeholder="Confirm password"
              value={managerForm.password_confirmation}
              onChange={(e) =>
                setManagerForm((current) => ({
                  ...current,
                  password_confirmation: e.target.value,
                }))
              }
            />
          </label>

          <button className="action-btn" type="submit">
            Save Manager
          </button>
        </form>
      </div>
    </div>
  );
}


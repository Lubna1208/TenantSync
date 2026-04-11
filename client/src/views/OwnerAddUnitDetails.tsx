import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { authFetch, clearStoredAuth } from "../helpers/authApi";

import "../styles/managerDashboard.css";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

type Property = {
  id: number;
  name: string;
  address: string;
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

export default function OwnerAddUnitDetails() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [unitForm, setUnitForm] = useState({
    unit_number: "",
    floor: "",
    rent_amount: "",
    status: "vacant" as "vacant" | "occupied",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedProperty = useMemo(() => {
    if (!propertyId) return null;
    const id = Number(propertyId);
    return properties.find((item) => item.id === id) ?? null;
  }, [properties, propertyId]);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await authFetch("/owner/properties", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        clearStoredAuth();
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        setError(data?.message ?? "Properties could not be loaded.");
        setProperties([]);
        return;
      }

      setProperties((data?.data as Property[] | undefined) ?? []);
    } catch {
      setError("Network error while loading properties.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    void loadProperties();
  }, [user, navigate, loadProperties]);

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

  async function createUnit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!propertyId) {
      setError("Please choose a property first.");
      return;
    }

    try {
      const res = await authFetch(`/owner/properties/${propertyId}/units`, {
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
      await loadProperties();
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
        <div className="manager-header">
          <div className="manager-header-copy">
            <div className="manager-console-badge">Owner Console</div>
            <h2>Add unit details</h2>
            <p>Create new units under a selected property.</p>
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
          <h3>Add Unit Details</h3>
          <p>Fill up the form and save unit details for the selected property.</p>
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
              onClick={() => navigate("/dashboard/invite")}
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
          {loading ? <p className="empty-text">Loading properties...</p> : null}

          <label className="manager-field-group">
            <span className="manager-form-label">Property</span>
            <select
              className="manager-input manager-select-input"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={loading}
            >
              <option value="">Choose property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>

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
            disabled={!selectedProperty}
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
            disabled={!selectedProperty}
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
            disabled={!selectedProperty}
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
            disabled={!selectedProperty}
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>

          <button className="action-btn" type="submit" disabled={!selectedProperty}>
            Save Unit
          </button>
        </form>
      </div>
    </div>
  );
}


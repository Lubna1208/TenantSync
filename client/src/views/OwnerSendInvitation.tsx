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

type Unit = {
  id: number;
  unit_number: string;
  status?: "vacant" | "occupied";
};

type Property = {
  id: number;
  name: string;
  address: string;
  units?: Unit[];
};

type AssignTenantResponse = {
  message?: string;
  invitation?: {
    invitation_url?: string | null;
  } | null;
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

export default function OwnerSendInvitation() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [tenantForm, setTenantForm] = useState({
    name: "",
    email: "",
    move_in_date: "",
    lease_start: "",
    lease_end: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [invitePreviewUrl, setInvitePreviewUrl] = useState("");

  const selectedProperty = useMemo(() => {
    if (!propertyId) return null;
    const id = Number(propertyId);
    return properties.find((item) => item.id === id) ?? null;
  }, [properties, propertyId]);

  const units = selectedProperty?.units ?? [];

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
      setInvitePreviewUrl("");
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

  async function assignTenant(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setInvitePreviewUrl("");

    if (!propertyId) {
      setError("Please choose a property first.");
      return;
    }

    if (!unitId) {
      setError("Please choose a unit first.");
      return;
    }

    try {
      const res = await authFetch(`/owner/units/${unitId}/assign-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenantForm.name,
          email: tenantForm.email,
          move_in_date: tenantForm.move_in_date || null,
          lease_start: tenantForm.lease_start || null,
          lease_end: tenantForm.lease_end || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getFailureMessage(data, "Tenant invitation failed."));
        return;
      }

      setTenantForm({
        name: "",
        email: "",
        move_in_date: "",
        lease_start: "",
        lease_end: "",
      });

      setInvitePreviewUrl(
        ((data as AssignTenantResponse | null)?.invitation?.invitation_url ?? "").trim()
      );
      setMessage(data?.message ?? "Tenant invitation sent successfully.");
      await loadProperties();
    } catch {
      setError("Network error while sending tenant invitation.");
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
            <h2>Send tenant invitation</h2>
            <p>Select a property + unit, then email an invitation to the tenant.</p>
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
          <h3>Tenant Invitation</h3>
          <p>Fill up the form and send an invitation link to the tenant email.</p>
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
              onClick={() => navigate("/dashboard/units/new")}
            >
              Add Unit Details
            </button>
          </div>
        </div>

        {noticeText ? (
          <div className={`manager-alert manager-section-alert ${noticeTone}`}>
            {noticeText}
          </div>
        ) : null}

        {invitePreviewUrl ? (
          <div className="manager-alert manager-section-alert success">
            Invitation link for local testing: {invitePreviewUrl}
          </div>
        ) : null}

        <form className="dashboard-panel dashboard-side-panel manager-form" onSubmit={assignTenant}>
          {loading ? <p className="empty-text">Loading properties...</p> : null}

          <label className="manager-field-group">
            <span className="manager-form-label">Property</span>
            <select
              className="manager-input manager-select-input"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setUnitId("");
              }}
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

          <label className="manager-field-group">
            <span className="manager-form-label">Unit</span>
            <select
              className="manager-input manager-select-input"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              disabled={!selectedProperty}
            >
              <option value="">Choose unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_number}
                  {unit.status ? ` (${unit.status})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Tenant Name</span>
            <input
              className="manager-input"
              placeholder="Enter tenant name"
              value={tenantForm.name}
              onChange={(e) =>
                setTenantForm((current) => ({ ...current, name: e.target.value }))
              }
              disabled={!selectedProperty}
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Tenant Email</span>
            <input
              className="manager-input"
              placeholder="Enter tenant email"
              type="email"
              value={tenantForm.email}
              onChange={(e) =>
                setTenantForm((current) => ({ ...current, email: e.target.value }))
              }
              disabled={!selectedProperty}
            />
          </label>

          <label className="manager-field-group">
            <span className="manager-form-label">Move In Date</span>
            <input
              className="manager-input manager-date-input"
              type="date"
              value={tenantForm.move_in_date}
              onChange={(e) =>
                setTenantForm((current) => ({
                  ...current,
                  move_in_date: e.target.value,
                }))
              }
              disabled={!selectedProperty}
            />
          </label>

          <div className="manager-inline-fields">
            <label className="manager-field-group">
              <span className="manager-form-label">Lease Start</span>
              <input
                className="manager-input manager-date-input"
                type="date"
                value={tenantForm.lease_start}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    lease_start: e.target.value,
                  }))
                }
                disabled={!selectedProperty}
              />
            </label>
            <label className="manager-field-group">
              <span className="manager-form-label">Lease End</span>
              <input
                className="manager-input manager-date-input"
                type="date"
                value={tenantForm.lease_end}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    lease_end: e.target.value,
                  }))
                }
                disabled={!selectedProperty}
              />
            </label>
          </div>

          <button className="action-btn" type="submit" disabled={!selectedProperty}>
            Send Invitation
          </button>
        </form>
      </div>
    </div>
  );
}

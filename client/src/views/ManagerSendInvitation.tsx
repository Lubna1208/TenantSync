import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type TenantUser = {
  id: number;
  name: string;
  email: string;
};

type TenantRecord = {
  id: number;
  user?: TenantUser | null;
};

type Unit = {
  id: number;
  unit_number: string;
  status: "vacant" | "occupied";
  tenants?: TenantRecord[];
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

export default function ManagerSendInvitation() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [tenantForm, setTenantForm] = useState({
    unit_id: "",
    name: "",
    email: "",
    date_of_birth: "",
    move_in_date: "",
    lease_start: "",
    lease_end: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [invitePreviewUrl, setInvitePreviewUrl] = useState("");

  const property = dashboard?.property ?? null;
  const units = property?.units ?? [];

  const assignableUnits = useMemo(
    () => units.filter((unit) => unit.status !== "occupied"),
    [units]
  );

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
      setInvitePreviewUrl("");
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

  async function assignTenant(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setInvitePreviewUrl("");

    if (!tenantForm.unit_id) {
      setError("Please choose a unit first.");
      return;
    }

    try {
      const res = await authFetch(`/manager/units/${tenantForm.unit_id}/assign-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...tenantForm,
          date_of_birth: tenantForm.date_of_birth || null,
          move_in_date: tenantForm.move_in_date || null,
          lease_start: tenantForm.lease_start || null,
          lease_end: tenantForm.lease_end || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(getFailureMessage(data, "Tenant assignment failed."));
        return;
      }

      setTenantForm({
        unit_id: "",
        name: "",
        email: "",
        date_of_birth: "",
        move_in_date: "",
        lease_start: "",
        lease_end: "",
      });

      setInvitePreviewUrl(
        ((data as AssignTenantResponse | null)?.invitation?.invitation_url ?? "").trim()
      );
      setMessage(data?.message ?? "Tenant invitation sent successfully.");
      await loadDashboard();
    } catch {
      setError("Network error while assigning tenant.");
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
          <h3>Send Tenant Invitation</h3>
          <p>Create a tenant login invitation for a selected unit.</p>
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
              onClick={() => navigate("/dashboard-manager/units/new")}
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

        <form
          className="dashboard-panel dashboard-side-panel manager-form assign-tenant-form"
          onSubmit={assignTenant}
        >
          {loading ? (
            <p className="empty-text">Loading assigned property...</p>
          ) : !property ? (
            <p className="empty-text">No property assigned yet. Ask the owner to assign a property.</p>
          ) : null}

          <label className="manager-field-group">
            <span className="manager-form-label">Unit</span>
            <select
              className="manager-input manager-select-input"
              value={tenantForm.unit_id}
              onChange={(e) =>
                setTenantForm((current) => ({
                  ...current,
                  unit_id: e.target.value,
                }))
              }
              disabled={!property}
            >
              <option value="">Choose unit</option>
              {assignableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_number}
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
              disabled={!property}
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
              disabled={!property}
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
              disabled={!property}
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
                disabled={!property}
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
                disabled={!property}
              />
            </label>
          </div>

          <button className="action-btn" type="submit" disabled={!property}>
            Send Invitation
          </button>
        </form>
      </div>
    </div>
  );
}

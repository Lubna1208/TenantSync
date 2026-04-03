import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ManagerHeader from "../components/manager/ManagerHeader";
import StatsCards from "../components/manager/StatsCards";
import ApartmentTable from "../components/manager/ApartmentTable";
import QuickActions from "../components/manager/QuickActions";

import "../styles/managerDashboard.css";

const API = "http://localhost:8000/api";

type User = {
  id: number;
  name: string;
  email: string;
  date_of_birth?: string | null;
  role?: string;
  status?: string;
};

type TenantUser = {
  id: number;
  name: string;
  email: string;
};

type TenantRecord = {
  id: number;
  unit_id?: number | null;
  lease_start?: string | null;
  lease_end?: string | null;
  user?: TenantUser | null;
};

type Unit = {
  id: number;
  unit_number: string;
  floor?: string | null;
  rent_amount: number;
  status: "vacant" | "occupied";
  tenants?: TenantRecord[];
};

type Property = {
  id: number;
  name: string;
  address: string;
  total_units: number;
  units?: Unit[];
};

type DashboardResponse = {
  property: Property;
  summary: {
    unit_limit: number;
    units_created: number;
    vacant_units: number;
    occupied_units: number;
  };
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

export default function DashboardManager() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [unitForm, setUnitForm] = useState({
    unit_number: "",
    floor: "",
    rent_amount: "",
    status: "vacant",
  });
  const [tenantForm, setTenantForm] = useState({
    unit_id: "",
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    date_of_birth: "",
    move_in_date: "",
    lease_start: "",
    lease_end: "",
  });
  const [removeTenantUnitId, setRemoveTenantUnitId] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    void loadDashboard();
  }, [user, navigate]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/manager/dashboard`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("ts_user");
        localStorage.removeItem("ts_token");
        sessionStorage.removeItem("ts_user");
        setUser(null);
        navigate("/login");
        return;
      }

      if (!res.ok || !data) {
        setError(data?.message ?? "Manager dashboard could not be loaded.");
        setDashboard(null);
        return;
      }

      setDashboard(data.data ?? null);
      if (data.data === null) {
        setMessage(data.message ?? "No property is assigned to this manager yet.");
      }
    } catch {
      setError("Network error while loading manager dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore logout API error
    }

    localStorage.removeItem("ts_user");
    localStorage.removeItem("ts_token");
    sessionStorage.removeItem("ts_user");
    setUser(null);
    navigate("/login");
  }

  function setSuccess(text: string) {
    setMessage(text);
    setError("");
  }

  function setFailure(text: string) {
    setError(text);
    setMessage("");
  }

  async function createUnit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/manager/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...unitForm,
          rent_amount: Number(unitForm.rent_amount),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(data?.message ?? "Unit creation failed.");
        return;
      }

      setUnitForm({
        unit_number: "",
        floor: "",
        rent_amount: "",
        status: "vacant",
      });
      setSuccess(data?.message ?? "Unit created successfully.");
      await loadDashboard();
    } catch {
      setFailure("Network error while creating unit.");
    }
  }

  async function assignTenant(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!tenantForm.unit_id) {
      setFailure("Please choose a unit first.");
      return;
    }

    try {
      const res = await fetch(
        `${API}/manager/units/${tenantForm.unit_id}/assign-tenant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...tenantForm,
            date_of_birth: tenantForm.date_of_birth || null,
            move_in_date: tenantForm.move_in_date || null,
            lease_start: tenantForm.lease_start || null,
            lease_end: tenantForm.lease_end || null,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(data?.message ?? "Tenant assignment failed.");
        return;
      }

      setTenantForm({
        unit_id: "",
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        date_of_birth: "",
        move_in_date: "",
        lease_start: "",
        lease_end: "",
      });
      setSuccess(data?.message ?? "Tenant assigned successfully.");
      await loadDashboard();
    } catch {
      setFailure("Network error while assigning tenant.");
    }
  }

  async function removeTenant() {
    setMessage("");
    setError("");

    if (!removeTenantUnitId) {
      setFailure("Please choose an occupied unit first.");
      return;
    }

    try {
      const res = await fetch(
        `${API}/manager/units/${removeTenantUnitId}/tenant`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(data?.message ?? "Could not remove tenant.");
        return;
      }

      setRemoveTenantUnitId("");
      setSuccess(data?.message ?? "Tenant removed successfully.");
      await loadDashboard();
    } catch {
      setFailure("Network error while removing tenant.");
    }
  }

  if (!user) return null;

  const property = dashboard?.property ?? null;
  const units = property?.units ?? [];

  const statsData = [
    {
      id: "all",
      label: "Unit Limit",
      value: dashboard?.summary.unit_limit ?? 0,
      note: "Set by owner",
      icon: "Limit",
    },
    {
      id: "created",
      label: "Units Added",
      value: dashboard?.summary.units_created ?? 0,
      note: "Saved in this property",
      icon: "Units",
    },
    {
      id: "occupied",
      label: "Occupied",
      value: dashboard?.summary.occupied_units ?? 0,
      note: "Currently assigned",
      icon: "Full",
    },
    {
      id: "vacant",
      label: "Vacant",
      value: dashboard?.summary.vacant_units ?? 0,
      note: "Ready for tenants",
      icon: "Open",
    },
  ];

  const apartments = units.map((unit) => {
    const activeTenant = unit.tenants?.find((tenant) => tenant.unit_id !== null);
    const hasTenant = !!activeTenant?.user;

    return {
      id: unit.id,
      unit: unit.unit_number,
      tenant: activeTenant?.user?.name ?? "Empty",
      status: unit.status === "occupied" ? "Occupied" : "Vacant",
      rent: Number(unit.rent_amount ?? 0),
      leaseStatus: hasTenant
        ? activeTenant?.lease_end
          ? "Active"
          : "Pending"
        : "Expired",
      lastPayment: property?.name ?? "Assigned Property",
    };
  });

  const quickActions = [
    {
      id: 1,
      label: property ? property.name : "No Property Yet",
      description: property
        ? `${property.address}`
        : "Owner has not assigned a property yet",
      icon: "Property",
    },
    {
      id: 2,
      label: "Unit Capacity",
      description: `${dashboard?.summary.units_created ?? 0} of ${
        dashboard?.summary.unit_limit ?? 0
      } units added`,
      icon: "Plan",
    },
    {
      id: 3,
      label: "Vacancy Status",
      description: `${dashboard?.summary.vacant_units ?? 0} units are still vacant`,
      icon: "Status",
    },
  ];

  return (
    <div className="manager-dashboard">
      <div className="dashboard-container">
        <ManagerHeader
          user={{
            name: user.name || "Manager",
            email: user.email || "manager@tenantsync.com",
          }}
          onLogout={logout}
        />

        {(message || error) && (
          <div className={`manager-alert ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        <StatsCards
          stats={statsData}
          activeFilter={activeFilter}
          onCardClick={setActiveFilter}
        />

        <div className="quick-actions-section">
          <QuickActions actions={quickActions} />
        </div>

        <div className="dashboard-main-grid">
          <div>
            <ApartmentTable
              apartments={apartments}
              searchTerm={searchTerm}
              activeFilter={activeFilter}
              setSearchTerm={setSearchTerm}
            />
          </div>

          <div className="dashboard-right-column">
            <div className="dashboard-panel">
              <h3>Assigned Property</h3>
              {loading ? (
                <p className="empty-text">Loading property...</p>
              ) : property ? (
                <div className="manager-property-summary">
                  <p>
                    <strong>{property.name}</strong>
                  </p>
                  <p>{property.address}</p>
                  <p>
                    Unit limit: {dashboard?.summary.unit_limit ?? 0}
                  </p>
                  <p>
                    Added units: {dashboard?.summary.units_created ?? 0}
                  </p>
                </div>
              ) : (
                <p className="empty-text">
                  No property assigned by the owner yet.
                </p>
              )}
            </div>

            <form className="dashboard-panel manager-form" onSubmit={createUnit}>
              <h3>Add Unit Details</h3>
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
              />
              <input
                className="manager-input"
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
              />
              <select
                className="manager-input"
                value={unitForm.status}
                onChange={(e) =>
                  setUnitForm((current) => ({
                    ...current,
                    status: e.target.value as "vacant" | "occupied",
                  }))
                }
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </select>
              <button className="action-btn" type="submit" disabled={!property}>
                Save Unit
              </button>
            </form>

            <form className="dashboard-panel manager-form" onSubmit={assignTenant}>
              <h3>Assign Tenant</h3>
              <select
                className="manager-input"
                value={tenantForm.unit_id}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    unit_id: e.target.value,
                  }))
                }
              >
                <option value="">Choose vacant unit</option>
                {units
                  .filter((unit) => unit.status === "vacant")
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
              </select>
              <input
                className="manager-input"
                placeholder="Tenant name"
                value={tenantForm.name}
                onChange={(e) =>
                  setTenantForm((current) => ({ ...current, name: e.target.value }))
                }
              />
              <input
                className="manager-input"
                placeholder="Tenant email"
                type="email"
                value={tenantForm.email}
                onChange={(e) =>
                  setTenantForm((current) => ({ ...current, email: e.target.value }))
                }
              />
              <input
                className="manager-input"
                placeholder="Tenant password"
                type="password"
                value={tenantForm.password}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    password: e.target.value,
                  }))
                }
              />
              <input
                className="manager-input"
                placeholder="Confirm password"
                type="password"
                value={tenantForm.password_confirmation}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    password_confirmation: e.target.value,
                  }))
                }
              />
              <input
                className="manager-input"
                type="date"
                value={tenantForm.lease_start}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    lease_start: e.target.value,
                  }))
                }
              />
              <input
                className="manager-input"
                type="date"
                value={tenantForm.lease_end}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    lease_end: e.target.value,
                  }))
                }
              />
              <button className="action-btn" type="submit" disabled={!property}>
                Assign Tenant
              </button>
            </form>

            <div className="dashboard-panel manager-form">
              <h3>Remove Tenant</h3>
              <select
                className="manager-input"
                value={removeTenantUnitId}
                onChange={(e) => setRemoveTenantUnitId(e.target.value)}
              >
                <option value="">Choose occupied unit</option>
                {units
                  .filter((unit) => unit.status === "occupied")
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
              </select>
              <button
                className="action-btn"
                onClick={() => void removeTenant()}
                disabled={!property}
              >
                Delete Tenant Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

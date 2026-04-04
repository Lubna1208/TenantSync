import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type ComplaintItem = {
  id: number;
  title: string;
  description: string;
  category?: string | null;
  priority?: string | null;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  unit?: {
    id: number;
    unit_number: string;
  } | null;
  tenant?: {
    id: number;
    user?: {
      name: string;
      email: string;
    } | null;
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

function formatDate(value?: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatRelative(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));

  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function titleCase(value: string) {
  return value.split("_").join(" ").replace(/\\b\\w/g, (letter: string) => letter.toUpperCase());
}

export default function DashboardManager() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
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
  const [paymentForm, setPaymentForm] = useState({
    tenant_id: "",
    amount: "",
    payment_month: new Date().toISOString().slice(0, 7),
    payment_date: new Date().toISOString().slice(0, 10),
    status: "paid",
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    target_role: "tenant",
  });

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
      const [dashboardRes, complaintsRes] = await Promise.all([
        fetch(`${API}/manager/dashboard`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API}/manager/complaints`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const dashboardData = await dashboardRes.json().catch(() => null);
      const complaintsData = await complaintsRes.json().catch(() => null);

      if (dashboardRes.status === 401 || complaintsRes.status === 401) {
        localStorage.removeItem("ts_user");
        localStorage.removeItem("ts_token");
        sessionStorage.removeItem("ts_user");
        setUser(null);
        navigate("/login");
        return;
      }

      if (!dashboardRes.ok || !dashboardData) {
        setError(dashboardData?.message ?? "Manager dashboard could not be loaded.");
        setDashboard(null);
        setComplaints([]);
        return;
      }

      setDashboard(dashboardData.data ?? null);
      setComplaints(complaintsData?.data ?? []);

      if (dashboardData.data === null) {
        setMessage(dashboardData.message ?? "No property is assigned to this manager yet.");
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

  async function createUnit(e: FormEvent) {
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

  async function assignTenant(e: FormEvent) {
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
      const res = await fetch(`${API}/manager/units/${removeTenantUnitId}/tenant`, {
        method: "DELETE",
        credentials: "include",
      });

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

  async function updateComplaintStatus(id: number, status: string) {
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/manager/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(data?.message ?? "Complaint update failed.");
        return;
      }

      setSuccess(data?.message ?? "Complaint updated successfully.");
      await loadDashboard();
    } catch {
      setFailure("Network error while updating complaint.");
    }
  }

  async function savePayment(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!paymentForm.tenant_id) {
      setFailure("Choose a tenant before saving a payment.");
      return;
    }

    try {
      const res = await fetch(`${API}/manager/rent-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tenant_id: Number(paymentForm.tenant_id),
          amount: Number(paymentForm.amount),
          payment_month: paymentForm.payment_month,
          payment_date: paymentForm.payment_date || null,
          status: paymentForm.status,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(data?.message ?? "Rent payment could not be saved.");
        return;
      }

      setPaymentForm((current) => ({
        ...current,
        tenant_id: "",
        amount: "",
      }));
      setSuccess(data?.message ?? "Rent payment saved successfully.");
    } catch {
      setFailure("Network error while saving rent payment.");
    }
  }

  async function publishAnnouncement(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/manager/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(announcementForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(data?.message ?? "Announcement could not be published.");
        return;
      }

      setAnnouncementForm({
        title: "",
        message: "",
        target_role: "tenant",
      });
      setSuccess(data?.message ?? "Announcement published successfully.");
    } catch {
      setFailure("Network error while publishing announcement.");
    }
  }

  const property = dashboard?.property ?? null;
  const units = property?.units ?? [];
  const tenants = useMemo(
    () =>
      units
        .map((unit) => {
          const activeTenant = unit.tenants?.find((tenant) => tenant.unit_id !== null);

          if (!activeTenant?.user) {
            return null;
          }

          return {
            tenantId: activeTenant.id,
            unitId: unit.id,
            unitNumber: unit.unit_number,
            name: activeTenant.user.name,
            email: activeTenant.user.email,
            rentAmount: Number(unit.rent_amount ?? 0),
          };
        })
        .filter((value): value is NonNullable<typeof value> => value !== null),
    [units]
  );

  if (!user) return null;

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
      lastPayment: hasTenant
        ? activeTenant?.lease_start
          ? `Lease ${formatDate(activeTenant.lease_start)}`
          : "Tenant assigned"
        : "No tenant",
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
      label: "Active Tenants",
      description: `${tenants.length} tenant accounts currently assigned`,
      icon: "People",
    },
    {
      id: 3,
      label: "Open Complaints",
      description: `${complaints.filter((item) => item.status !== "resolved").length} items need attention`,
      icon: "Alert",
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
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <ApartmentTable
              apartments={apartments}
              searchTerm={searchTerm}
              activeFilter={activeFilter}
              setSearchTerm={setSearchTerm}
            />

            <div className="dashboard-panel">
              <div className="table-header-row">
                <h3>Tenant Complaints</h3>
                <span style={{ color: "#666", fontSize: "13px", fontWeight: 600 }}>
                  {complaints.length} complaint{complaints.length === 1 ? "" : "s"}
                </span>
              </div>

              {loading ? (
                <p className="empty-text">Loading complaints...</p>
              ) : complaints.length === 0 ? (
                <p className="empty-text">No complaints submitted in this property.</p>
              ) : (
                <div className="complaints-list">
                  {complaints.map((complaint) => (
                    <div key={complaint.id} className="complaint-item">
                      <div className="complaint-top">
                        <div>
                          <h4>{complaint.title}</h4>
                          <p>
                            Unit {complaint.unit?.unit_number ?? "-"} • {complaint.tenant?.user?.name ?? "Tenant"}
                          </p>
                        </div>
                        <span className={`priority-badge ${(complaint.priority ?? "medium").toLowerCase()}`}>
                          {titleCase(complaint.priority ?? "medium")}
                        </span>
                      </div>

                      <p>{complaint.description}</p>
                      <p>
                        Category: {complaint.category || "General"} • Submitted {formatRelative(complaint.created_at)}
                      </p>

                      <div
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span className={`status-badge ${complaint.status === "resolved" ? "resolved" : complaint.status === "in_progress" ? "in-progress" : "pending"}`}>
                          {titleCase(complaint.status)}
                        </span>

                        <select
                          className="manager-input"
                          style={{ width: "180px", maxWidth: "100%" }}
                          value={complaint.status}
                          onChange={(e) => void updateComplaintStatus(complaint.id, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                  <p>Unit limit: {dashboard?.summary.unit_limit ?? 0}</p>
                  <p>Added units: {dashboard?.summary.units_created ?? 0}</p>
                </div>
              ) : (
                <p className="empty-text">No property assigned by the owner yet.</p>
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
                value={tenantForm.move_in_date}
                onChange={(e) =>
                  setTenantForm((current) => ({
                    ...current,
                    move_in_date: e.target.value,
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

            <form className="dashboard-panel manager-form" onSubmit={savePayment}>
              <h3>Record Rent Payment</h3>
              <select
                className="manager-input"
                value={paymentForm.tenant_id}
                onChange={(e) => {
                  const selectedTenant = tenants.find(
                    (item) => String(item.tenantId) === e.target.value
                  );

                  setPaymentForm((current) => ({
                    ...current,
                    tenant_id: e.target.value,
                    amount: selectedTenant ? String(selectedTenant.rentAmount) : current.amount,
                  }));
                }}
              >
                <option value="">Choose tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.tenantId} value={tenant.tenantId}>
                    {tenant.name} - Unit {tenant.unitNumber}
                  </option>
                ))}
              </select>
              <input
                className="manager-input"
                type="month"
                value={paymentForm.payment_month}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    payment_month: e.target.value,
                  }))
                }
              />
              <input
                className="manager-input"
                type="number"
                min="0"
                placeholder="Amount"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    amount: e.target.value,
                  }))
                }
              />
              <input
                className="manager-input"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    payment_date: e.target.value,
                  }))
                }
              />
              <select
                className="manager-input"
                value={paymentForm.status}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    status: e.target.value,
                  }))
                }
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <button className="action-btn" type="submit" disabled={!property}>
                Save Payment
              </button>
            </form>

            <form className="dashboard-panel manager-form" onSubmit={publishAnnouncement}>
              <h3>Publish Announcement</h3>
              <input
                className="manager-input"
                placeholder="Announcement title"
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    title: e.target.value,
                  }))
                }
              />
              <textarea
                className="manager-input"
                style={{ minHeight: "110px", resize: "vertical", fontFamily: "inherit" }}
                placeholder="Write the update for tenants"
                value={announcementForm.message}
                onChange={(e) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    message: e.target.value,
                  }))
                }
              />
              <select
                className="manager-input"
                value={announcementForm.target_role}
                onChange={(e) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    target_role: e.target.value,
                  }))
                }
              >
                <option value="tenant">Tenant only</option>
                <option value="all">Everyone</option>
                <option value="manager">Manager only</option>
              </select>
              <button className="action-btn" type="submit" disabled={!property}>
                Publish Notice
              </button>
            </form>
          </div>
        </div>

        <div className="dashboard-footer-actions">
          <div
            className="dashboard-panel"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <strong style={{ display: "block", fontSize: "20px", marginBottom: "4px" }}>{tenants.length}</strong>
              <p style={{ margin: 0, color: "#666", fontSize: "13px" }}>Active tenants</p>
            </div>
            <div>
              <strong style={{ display: "block", fontSize: "20px", marginBottom: "4px" }}>{complaints.filter((item) => item.status === "open").length}</strong>
              <p style={{ margin: 0, color: "#666", fontSize: "13px" }}>Open complaints</p>
            </div>
            <div>
              <strong style={{ display: "block", fontSize: "20px", marginBottom: "4px" }}>{paymentForm.payment_month ? formatMonth(paymentForm.payment_month) : "This month"}</strong>
              <p style={{ margin: 0, color: "#666", fontSize: "13px" }}>Current rent cycle</p>
            </div>
            <div>
              <strong style={{ display: "block", fontSize: "20px", marginBottom: "4px" }}>{property ? formatDate(new Date().toISOString()) : "Waiting"}</strong>
              <p style={{ margin: 0, color: "#666", fontSize: "13px" }}>Last dashboard refresh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}










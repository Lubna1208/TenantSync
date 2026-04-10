import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import ManagerHeaderPolished from "../components/manager/ManagerHeaderPolished";
import StatsCards from "../components/manager/StatsCards";
import ApartmentTable from "../components/manager/ApartmentTable";

import "../styles/managerDashboard.css";

const API = "http://localhost:8000/api";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;

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
  manager_reply?: string | null;
  manager_reply_sent_at?: string | null;
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

type AnnouncementItem = {
  id: number;
  created_by?: number;
};

type NoticeContext = "general" | "actions" | "communication" | "payment";

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

function getFirstValidationError(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") {
    return null;
  }

  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function getFailureMessage(
  data: { message?: string; errors?: unknown } | null,
  fallback: string
) {
  const firstValidationError = getFirstValidationError(data?.errors);
  const message = data?.message?.trim();

  if (message && message.toLowerCase() !== "validation failed" && message.toLowerCase() !== "validation failed.") {
    return message;
  }

  if (firstValidationError) {
    return firstValidationError;
  }

  return message || fallback;
}

async function generateGeminiText(prompt: string) {
  let lastErrorMessage = "Gemini API request failed.";

  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json().catch(() => null);
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (res.ok && reply) {
      return reply;
    }

    lastErrorMessage = data?.error?.message ?? lastErrorMessage;

    if (res.status !== 503) {
      break;
    }
  }

  throw new Error(lastErrorMessage);
}

export default function DashboardManager() {
  const navigate = useNavigate();
  const unitOverviewRef = useRef<HTMLElement | null>(null);
  const managerActionsRef = useRef<HTMLElement | null>(null);
  const tenantCommunicationRef = useRef<HTMLElement | null>(null);
  const paymentSectionRef = useRef<HTMLElement | null>(null);

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [noticeContext, setNoticeContext] = useState<NoticeContext>("general");
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
  const [replyMap, setReplyMap] = useState<Record<number, string>>({});
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [sendingReplyId, setSendingReplyId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    void loadDashboard();
  }, [user, navigate]);

  useEffect(() => {
    if (!message && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearNotice();
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message, error]);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [dashboardRes, complaintsRes, announcementsRes] = await Promise.all([
        fetch(`${API}/manager/dashboard`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API}/manager/complaints`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API}/announcements`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const dashboardData = await dashboardRes.json().catch(() => null);
      const complaintsData = await complaintsRes.json().catch(() => null);
      const announcementsData = await announcementsRes.json().catch(() => null);

      if (dashboardRes.status === 401 || complaintsRes.status === 401 || announcementsRes.status === 401) {
        localStorage.removeItem("ts_user");
        localStorage.removeItem("ts_token");
        sessionStorage.removeItem("ts_user");
        setUser(null);
        navigate("/login");
        return;
      }

      if (!dashboardRes.ok || !dashboardData) {
        setFailure(dashboardData?.message ?? "Manager dashboard could not be loaded.", "general");
        setDashboard(null);
        setComplaints([]);
        setAnnouncementsCount(0);
        return;
      }

      setDashboard(dashboardData.data ?? null);
      setComplaints(complaintsData?.data ?? []);
      setAnnouncementsCount(
        (announcementsData?.data as AnnouncementItem[] | undefined)?.filter(
          (item) => item.created_by === user?.id
        ).length ?? 0
      );

      if (dashboardData.data === null) {
        setSuccess(dashboardData.message ?? "No property is assigned to this manager yet.", "general");
      }
    } catch {
      setFailure("Network error while loading manager dashboard.", "general");
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

  function clearNotice() {
    setMessage("");
    setError("");
    setNoticeContext("general");
  }

  function setSuccess(text: string, context: NoticeContext = "general") {
    setMessage(text);
    setError("");
    setNoticeContext(context);
  }

  function setFailure(text: string, context: NoticeContext = "general") {
    setError(text);
    setMessage("");
    setNoticeContext(context);
  }

  function scrollToSection(section: "units" | "actions" | "communication" | "payments") {
    const sectionMap = {
      units: unitOverviewRef,
      actions: managerActionsRef,
      communication: tenantCommunicationRef,
      payments: paymentSectionRef,
    } as const;

    sectionMap[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function createUnit(e: FormEvent) {
    e.preventDefault();
    clearNotice();

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
        setFailure(getFailureMessage(data, "Unit creation failed."), "actions");
        return;
      }

      setUnitForm({
        unit_number: "",
        floor: "",
        rent_amount: "",
        status: "vacant",
      });
      setSuccess(data?.message ?? "Unit created successfully.", "actions");
      await loadDashboard();
    } catch {
      setFailure("Network error while creating unit.", "actions");
    }
  }

  async function assignTenant(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    if (!tenantForm.unit_id) {
      setFailure("Please choose a unit first.", "actions");
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
            password_confirmation: tenantForm.password,
            date_of_birth: tenantForm.date_of_birth || null,
            move_in_date: tenantForm.move_in_date || null,
            lease_start: tenantForm.lease_start || null,
            lease_end: tenantForm.lease_end || null,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(getFailureMessage(data, "Tenant assignment failed."), "actions");
        return;
      }

      setTenantForm({
        unit_id: "",
        name: "",
        email: "",
        password: "",
        date_of_birth: "",
        move_in_date: "",
        lease_start: "",
        lease_end: "",
      });
      setSuccess(data?.message ?? "Tenant assigned successfully.", "actions");
      await loadDashboard();
    } catch {
      setFailure("Network error while assigning tenant.", "actions");
    }
  }

  async function removeTenant() {
    clearNotice();

    if (!removeTenantUnitId) {
      setFailure("Please choose an occupied unit first.", "actions");
      return;
    }

    try {
      const res = await fetch(`${API}/manager/units/${removeTenantUnitId}/tenant`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(getFailureMessage(data, "Could not remove tenant."), "actions");
        return;
      }

      setRemoveTenantUnitId("");
      setSuccess(data?.message ?? "Tenant removed successfully.", "actions");
      await loadDashboard();
    } catch {
      setFailure("Network error while removing tenant.", "actions");
    }
  }

  async function updateComplaintStatus(id: number, status: string) {
    clearNotice();

    try {
      const res = await fetch(`${API}/manager/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(getFailureMessage(data, "Complaint update failed."), "communication");
        return;
      }

      setSuccess(data?.message ?? "Complaint updated successfully.", "communication");
      await loadDashboard();
    } catch {
      setFailure("Network error while updating complaint.", "communication");
    }
  }

  async function savePayment(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    if (!paymentForm.tenant_id) {
      setFailure("Choose a tenant before saving a payment.", "payment");
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
        setFailure(getFailureMessage(data, "Rent payment could not be saved."), "payment");
        return;
      }

      setPaymentForm((current) => ({
        ...current,
        tenant_id: "",
        amount: "",
      }));
      setSuccess(data?.message ?? "Rent payment saved successfully.", "payment");
    } catch {
      setFailure("Network error while saving rent payment.", "payment");
    }
  }

  async function publishAnnouncement(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    try {
      const res = await fetch(`${API}/manager/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(announcementForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(getFailureMessage(data, "Announcement could not be published."), "communication");
        return;
      }

      setAnnouncementForm({
        title: "",
        message: "",
        target_role: "tenant",
      });
      setAnnouncementsCount((current) => current + 1);
      setSuccess(data?.message ?? "Announcement published successfully.", "communication");
    } catch {
      setFailure("Network error while publishing announcement.", "communication");
    }
  }

  async function generateReply(complaint: ComplaintItem) {
    setGeneratingId(complaint.id);

    const statusDirection =
      complaint.status === "resolved"
        ? "The complaint is already resolved. Confirm the issue has been resolved, thank the tenant for their patience, and invite them to reopen or contact management if anything remains unresolved."
        : complaint.status === "in_progress"
          ? "The complaint is currently in progress. Acknowledge the issue, explain that work is underway, and reassure the tenant that the team will keep them updated."
          : "The complaint is newly open. Acknowledge receipt, explain that the team is reviewing it, and set expectations that the tenant will receive another update soon.";

    const prompt = `You are a professional property manager writing a reply to a tenant complaint.
Write a concise, empathetic, and professional response (3-5 sentences max).
Do not use placeholders like [Your Name]. Sign off as "The Management Team".
Match the tone and content to the complaint status.

Status-specific guidance: ${statusDirection}

Complaint Title: ${complaint.title}
Category: ${complaint.category ?? "General"}
Priority: ${complaint.priority ?? "Medium"}
Description: ${complaint.description}
Current Status: ${complaint.status}

Write the reply now:`;

    try {
      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is missing.");
      }

      const reply = await generateGeminiText(prompt);
      setReplyMap((prev) => ({ ...prev, [complaint.id]: reply }));
    } catch (err) {
      const fallback =
        err instanceof Error && err.message === "Gemini API key is missing."
          ? "Gemini API key is missing. Add VITE_GEMINI_API_KEY in client/.env."
          : "Error generating reply. Please try again.";

      setReplyMap((prev) => ({ ...prev, [complaint.id]: fallback }));
    } finally {
      setGeneratingId(null);
    }
  }

  async function sendReplyToTenant(complaint: ComplaintItem) {
    const managerReply = replyMap[complaint.id]?.trim();

    if (!managerReply) {
      setFailure("Generate or write a reply before sending it to the tenant.", "communication");
      return;
    }

    setSendingReplyId(complaint.id);
    clearNotice();

    try {
      const res = await fetch(`${API}/manager/complaints/${complaint.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ manager_reply: managerReply }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFailure(getFailureMessage(data, "Could not send the reply to the tenant."), "communication");
        return;
      }

      setReplyMap((prev) => ({
        ...prev,
        [complaint.id]: data?.data?.manager_reply ?? managerReply,
      }));
      setSuccess(data?.message ?? "Reply sent to tenant successfully.", "communication");
      await loadDashboard();
    } catch {
      setFailure("Network error while sending reply to the tenant.", "communication");
    } finally {
      setSendingReplyId(null);
    }
  }

  async function copyReply(complaintId: number) {
    const reply = replyMap[complaintId];
    if (!reply) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reply);
      setSuccess("AI reply copied to clipboard.", "communication");
    } catch {
      setFailure("Could not copy the AI reply.", "communication");
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
    {
      id: "active",
      label: "Unit Active",
      value: units.filter((unit) => {
        const activeTenant = unit.tenants?.find((tenant) => tenant.unit_id !== null);
        return !!activeTenant?.user && !!activeTenant.lease_end;
      }).length,
      note: "Lease currently active",
      icon: "Active",
    },
    {
      id: "expired",
      label: "Unit Expired",
      value: units.filter((unit) => {
        const activeTenant = unit.tenants?.find((tenant) => tenant.unit_id !== null);
        return !activeTenant?.user;
      }).length,
      note: "Lease needs renewal",
      icon: "Expired",
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

  const noticeText = error || message;
  const noticeTone = error ? "error" : "success";
  const generalNotice = noticeContext === "general" ? noticeText : "";
  const actionNotice = noticeContext === "actions" ? noticeText : "";
  const communicationNotice = noticeContext === "communication" ? noticeText : "";
  const paymentNotice = noticeContext === "payment" ? noticeText : "";

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

        {generalNotice && (
          <div className={`manager-alert ${noticeTone}`}>
            {generalNotice}
          </div>
        )}

        <section className="manager-overview-hero">
          <div className="manager-overview-copy">
            <div className="manager-overview-badge">Manager Summary</div>
            <h3>Property Overview</h3>
            {property ? (
              <>
                <div className="manager-overview-property-name">{property.name}</div>
                <div className="manager-overview-location">Location: {property.address}</div>
                <p className="manager-overview-text">
                  Assigned property overview and current activity.
                </p>
              </>
            ) : (
              <>
                <div className="manager-overview-property-name">No property assigned yet</div>
                <div className="manager-overview-location">Location: Waiting for owner assignment</div>
                <p className="manager-overview-text">
                  Property summary and activity will appear here after an assignment.
                </p>
              </>
            )}
            <div className="manager-overview-actions">
              <button
                type="button"
                className="manager-overview-action-btn"
                onClick={() => scrollToSection("units")}
              >
                Unit Overview
              </button>
              <button
                type="button"
                className="manager-overview-action-btn"
                onClick={() => scrollToSection("actions")}
              >
                Manager Actions
              </button>
              <button
                type="button"
                className="manager-overview-action-btn"
                onClick={() => scrollToSection("communication")}
              >
                Tenant Communication
              </button>
              <button
                type="button"
                className="manager-overview-action-btn"
                onClick={() => scrollToSection("payments")}
              >
                Rent Payments
              </button>
            </div>
          </div>
        </section>

        <section className="unit-overview-section" ref={unitOverviewRef}>
          <div className="unit-overview-header">
            <div className="unit-overview-badge">Unit Overview</div>
            <h3>Apartment Filters and Overview</h3>
            <p>Filter unit status quickly and review the apartment list from one section.</p>
          </div>

          <StatsCards
            stats={statsData}
            activeFilter={activeFilter}
            onCardClick={setActiveFilter}
          />

          <ApartmentTable
            apartments={apartments}
            searchTerm={searchTerm}
            activeFilter={activeFilter}
            setSearchTerm={setSearchTerm}
          />
        </section>

        <section className="manager-actions-section" ref={managerActionsRef}>
          <div className="manager-actions-header">
            <div className="manager-actions-badge">Manager Actions</div>
            <h3>Tenant and Unit Actions</h3>
            <p>Manage tenant assignment, add new units, and remove tenant access from one control area.</p>
          </div>

          {actionNotice && (
            <div className={`manager-alert manager-section-alert ${noticeTone}`}>
              {actionNotice}
            </div>
          )}

          <div className="manager-actions-grid">
            <form className="dashboard-panel dashboard-side-panel manager-form assign-tenant-form" onSubmit={assignTenant}>
              <h3>Assign Tenant</h3>
              <label className="manager-field-group">
                <span className="manager-form-label">Vacant Unit</span>
                <select
                  className="manager-input manager-select-input"
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
                />
              </label>
              <label className="manager-field-group">
                <span className="manager-form-label">Password</span>
                <input
                  className="manager-input"
                  placeholder="Enter password"
                  type="password"
                  value={tenantForm.password}
                  onChange={(e) =>
                    setTenantForm((current) => ({
                      ...current,
                      password: e.target.value,
                    }))
                  }
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
                  />
                </label>
              </div>
              <button className="action-btn" type="submit" disabled={!property}>
                Assign Tenant
              </button>
            </form>

            <div className="manager-actions-side">
              <form className="dashboard-panel dashboard-side-panel manager-form" onSubmit={createUnit}>
                <h3>Add Unit Details</h3>
                <p className="manager-form-subtitle">Add a new unit with rent and occupancy details for this property.</p>
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
                >
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                </select>
                <button className="action-btn" type="submit" disabled={!property}>
                  Save Unit
                </button>
              </form>

              <div className="dashboard-panel dashboard-side-panel manager-form remove-tenant-form">
                <h3>Remove Tenant</h3>
                <select
                  className="manager-input manager-select-input"
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
                  className="remove-tenant-btn"
                  onClick={() => void removeTenant()}
                  disabled={!property}
                >
                  Delete Tenant Login
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="tenant-communication-section" ref={tenantCommunicationRef}>
          <div className="tenant-communication-header">
            <div className="tenant-communication-badge">Tenant Communication</div>
            <h3>Complaints and Announcements</h3>
            <p>Review tenant complaints on the left and publish tenant announcements on the right.</p>
          </div>

          {communicationNotice && (
            <div className={`manager-alert manager-section-alert ${noticeTone}`}>
              {communicationNotice}
            </div>
          )}

          <div className="tenant-communication-stats">
            <div className="tenant-communication-stat-card">
              <span className="tenant-communication-stat-label">Tenant Complaints</span>
              <strong className="tenant-communication-stat-value">{complaints.length}</strong>
            </div>
            <div className="tenant-communication-stat-card">
              <span className="tenant-communication-stat-label">Announcements</span>
              <strong className="tenant-communication-stat-value">{announcementsCount}</strong>
            </div>
          </div>

        <div className="dashboard-main-grid tenant-communication-grid">
          <div className="dashboard-left-column">
            <div className="dashboard-panel complaints-panel">
              <div className="table-header-row">
                <h3>Tenant Complaints</h3>
                <span style={{ color: "#9cb8d0", fontSize: "13px", fontWeight: 600 }}>
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
                        <div className="complaint-copy">
                          <h4>{complaint.title}</h4>
                          <p>
                            Unit {complaint.unit?.unit_number ?? "-"} • {complaint.tenant?.user?.name ?? "Tenant"}
                          </p>
                        </div>
                        <div className="complaint-meta-column">
                          <span className={`priority-badge ${(complaint.priority ?? "medium").toLowerCase()}`}>
                            {titleCase(complaint.priority ?? "medium")}
                          </span>
                        </div>
                      </div>

                      <p>{complaint.description}</p>
                      <p>
                        Category: {complaint.category || "General"} • Submitted {formatRelative(complaint.created_at)}
                      </p>

                      <div className="complaint-footer">
                        <div className="complaint-status-row">
                          <span className={`status-badge ${complaint.status === "resolved" ? "resolved" : complaint.status === "in_progress" ? "in-progress" : "pending"}`}>
                            {titleCase(complaint.status)}
                          </span>
                          <select
                            className="manager-input manager-select-input complaint-status-select"
                            value={complaint.status}
                            onChange={(e) => void updateComplaintStatus(complaint.id, e.target.value)}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "14px",
                          padding: "14px",
                          borderRadius: "14px",
                          background: "rgba(29, 39, 72, 0.92)",
                          border: "1px solid rgba(176, 193, 227, 0.14)",
                        }}
                      >
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => void generateReply(complaint)}
                          disabled={generatingId === complaint.id}
                          style={{ minWidth: "220px" }}
                        >
                          {generatingId === complaint.id ? "Generating reply..." : "Generate AI Reply"}
                        </button>

                        {replyMap[complaint.id] ? (
                          <div style={{ marginTop: "12px" }}>
                            <textarea
                              className="manager-input manager-textarea"
                              value={replyMap[complaint.id]}
                              onChange={(e) =>
                                setReplyMap((prev) => ({
                                  ...prev,
                                  [complaint.id]: e.target.value,
                                }))
                              }
                              style={{ minHeight: "120px" }}
                            />
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => void copyReply(complaint.id)}
                              style={{ marginTop: "10px", minWidth: "160px" }}
                            >
                              Copy Reply
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => void sendReplyToTenant(complaint)}
                              disabled={sendingReplyId === complaint.id}
                              style={{ marginTop: "10px", marginLeft: "10px", minWidth: "220px" }}
                            >
                              {sendingReplyId === complaint.id ? "Sending Reply..." : "Send Reply To Tenant"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-right-column">
            <form className="dashboard-panel dashboard-side-panel manager-form announcement-form" onSubmit={publishAnnouncement}>
              <h3>Publish Announcement</h3>
              <label className="manager-field-group">
                <span className="manager-form-label">Announcement Title</span>
                <input
                  className="manager-input"
                  placeholder="Enter announcement title"
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm((current) => ({
                      ...current,
                      title: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="manager-field-group">
                <span className="manager-form-label">Message</span>
                <textarea
                  className="manager-input manager-textarea"
                  placeholder="Write the update for tenants"
                  value={announcementForm.message}
                  onChange={(e) =>
                    setAnnouncementForm((current) => ({
                      ...current,
                      message: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="manager-field-group">
                <span className="manager-form-label">Audience</span>
                <select
                  className="manager-input manager-select-input"
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
              </label>
              <button className="action-btn" type="submit" disabled={!property}>
                Publish Notice
              </button>
            </form>
          </div>
        </div>
        </section>

        <section className="payment-section" ref={paymentSectionRef}>
          <div className="payment-section-header">
            <div className="payment-section-badge">Rent Payments</div>
            <h3>Record Rent Payment</h3>
            <p>Keep rent payment updates in one final section at the bottom of the manager console.</p>
          </div>

          {paymentNotice && (
            <div className={`manager-alert manager-section-alert ${noticeTone}`}>
              {paymentNotice}
            </div>
          )}

          <form className="dashboard-panel dashboard-side-panel manager-form payment-form" onSubmit={savePayment}>
            <label className="manager-field-group">
              <span className="manager-form-label">Tenant</span>
              <select
                className="manager-input manager-select-input"
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
            </label>
            <label className="manager-field-group">
              <span className="manager-form-label">Payment Month</span>
              <input
                className="manager-input manager-month-input"
                type="month"
                value={paymentForm.payment_month}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    payment_month: e.target.value,
                  }))
                }
              />
            </label>
            <label className="manager-field-group">
              <span className="manager-form-label">Amount</span>
              <input
                className="manager-input"
                type="number"
                min="0"
                placeholder="Enter amount"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    amount: e.target.value,
                  }))
                }
              />
            </label>
            <label className="manager-field-group">
              <span className="manager-form-label">Payment Date</span>
              <input
                className="manager-input manager-date-input"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) =>
                  setPaymentForm((current) => ({
                    ...current,
                    payment_date: e.target.value,
                  }))
                }
              />
            </label>
            <label className="manager-field-group">
              <span className="manager-form-label">Status</span>
              <select
                className="manager-input manager-select-input"
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
            </label>
            <button className="action-btn" type="submit" disabled={!property}>
              Save Payment
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}












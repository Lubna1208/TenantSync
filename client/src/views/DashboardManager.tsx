import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import ManagerHeaderPolished from "../components/manager/ManagerHeaderPolished";
import StatsCards from "../components/manager/StatsCards";
import ApartmentTable from "../components/manager/ApartmentTable";
import { authFetch, clearStoredAuth } from "../helpers/authApi";

import "../styles/managerDashboard.css";

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
  status?: string;
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

type PaymentReportItem = {
  id: number;
  amount: number;
  currency?: string | null;
  payment_month: string;
  status: "paid" | "pending" | "unpaid";
  payment_date?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  receipt_url?: string | null;
  tenant?: {
    id: number;
    user?: TenantUser | null;
  } | null;
  unit?: {
    id: number;
    unit_number: string;
    apartment?: {
      id: number;
      name: string;
    } | null;
  } | null;
};

type DashboardResponse = {
  property: Property;
  summary: {
    unit_limit: number;
    units_created: number;
    vacant_units: number;
    occupied_units: number;
  };
  payments: PaymentReportItem[];
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

function formatMonth(value?: string | null) {
  if (!value) return "Current cycle";

  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount?: number | null, currency?: string | null) {
  const safeAmount = Number(amount ?? 0);
  const normalizedCurrency = (currency ?? "bdt").toUpperCase();

  if (normalizedCurrency === "BDT") {
    return `Tk ${safeAmount.toLocaleString()}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  }).format(safeAmount);
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
  const res = await authFetch("/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
    }),
  });

  const data = await res.json().catch(() => null);
  const reply = data?.reply;

  if (res.ok && typeof reply === "string" && reply.trim()) {
    return reply;
  }

  throw new Error(data?.message ?? "AI request failed.");
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
  const [removeTenantUnitId, setRemoveTenantUnitId] = useState("");
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
        authFetch("/manager/dashboard", {
          cache: "no-store",
        }),
        authFetch("/manager/complaints", {
          cache: "no-store",
        }),
        authFetch("/announcements", {
          cache: "no-store",
        }),
      ]);

      const dashboardData = await dashboardRes.json().catch(() => null);
      const complaintsData = await complaintsRes.json().catch(() => null);
      const announcementsData = await announcementsRes.json().catch(() => null);

      if (dashboardRes.status === 401 || complaintsRes.status === 401 || announcementsRes.status === 401) {
        clearStoredAuth();
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
      await authFetch("/auth/logout", {
        method: "POST",
      });
    } catch {
      // ignore logout API error
    }

    clearStoredAuth();
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

  async function removeTenant() {
    clearNotice();

    if (!removeTenantUnitId) {
      setFailure("Please choose an occupied unit first.", "actions");
      return;
    }

    try {
      const res = await authFetch(`/manager/units/${removeTenantUnitId}/tenant`, {
        method: "DELETE",
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
      const res = await authFetch(`/manager/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  async function publishAnnouncement(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    try {
      const res = await authFetch("/manager/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const reply = await generateGeminiText(prompt);
      setReplyMap((prev) => ({ ...prev, [complaint.id]: reply }));
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "Error generating reply. Please try again.";

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
      const res = await authFetch(`/manager/complaints/${complaint.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const paymentReport = dashboard?.payments ?? [];

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
  const paidPaymentsCount = paymentReport.filter((payment) => payment.status === "paid").length;

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
            <div className="manager-actions-shortcuts">
              <button
                type="button"
                className="manager-overview-action-btn"
                onClick={() => navigate("/dashboard-manager/invite")}
              >
                Send Tenant Invitation
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

          {actionNotice && (
            <>
              <div className={`manager-alert manager-section-alert ${noticeTone}`}>
                {actionNotice}
              </div>
            </>
          )}

          <div className="manager-actions-grid manager-actions-grid-single">
            <div className="dashboard-panel dashboard-side-panel manager-form remove-tenant-form">
              <h3>Remove Tenant</h3>
              <p className="manager-form-subtitle">
                Use the buttons above for invitation and unit creation. Remove a tenant login from here.
              </p>
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
            <h3>Saved Payment Report</h3>
            <p>Review the latest tenant rent payments for this property in one clean report feed.</p>
          </div>

          {paymentNotice && (
            <div className={`manager-alert manager-section-alert ${noticeTone}`}>
              {paymentNotice}
            </div>
          )}

          <div className="dashboard-panel payment-report-panel">
            <div className="table-header-row">
              <h3>Saved Payment Report</h3>
              <span style={{ color: "#9cb8d0", fontSize: "13px", fontWeight: 600 }}>
                {paidPaymentsCount} paid, {paymentReport.length} total
              </span>
            </div>

            {!property ? (
              <p className="empty-text">Assign a property first to see rent payment reports.</p>
            ) : loading ? (
              <p className="empty-text">Loading payment reports...</p>
            ) : paymentReport.length === 0 ? (
              <p className="empty-text">No rent payment records have been saved for this property yet.</p>
            ) : (
              <div className="payment-report-list">
                {paymentReport.map((payment) => (
                  <article key={payment.id} className="payment-report-card">
                    <div className="payment-report-top">
                      <div className="payment-report-copy">
                        <h4>{payment.tenant?.user?.name ?? "Tenant payment"}</h4>
                        <p className="payment-report-subtitle">
                          {payment.unit?.apartment?.name ?? property?.name ?? "Assigned property"} • Unit{" "}
                          {payment.unit?.unit_number ?? "-"}
                        </p>
                      </div>
                      <div className="payment-report-meta">
                        <span
                          className={`status-badge ${
                            payment.status === "paid"
                              ? "resolved"
                              : payment.status === "pending"
                                ? "in-progress"
                                : "pending"
                          }`}
                        >
                          {titleCase(payment.status)}
                        </span>
                      </div>
                    </div>

                    <div className="payment-report-grid">
                      <div className="payment-report-stat">
                        <span className="payment-report-label">Month</span>
                        <strong>{formatMonth(payment.payment_month)}</strong>
                      </div>
                      <div className="payment-report-stat">
                        <span className="payment-report-label">Amount</span>
                        <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                      </div>
                      <div className="payment-report-stat">
                        <span className="payment-report-label">Paid Date</span>
                        <strong>{formatDate(payment.paid_at ?? payment.payment_date)}</strong>
                      </div>
                      <div className="payment-report-stat">
                        <span className="payment-report-label">Method</span>
                        <strong>{titleCase(payment.payment_method ?? "stripe_checkout")}</strong>
                      </div>
                    </div>

                    {payment.receipt_url ? (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="payment-report-link"
                      >
                        Open Stripe receipt
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}












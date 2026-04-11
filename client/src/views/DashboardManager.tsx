import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ManagerHeaderPolished from "../components/manager/ManagerHeaderPolished";
import StatsCards from "../components/manager/StatsCards";
import ApartmentTable from "../components/manager/ApartmentTable";
import { getApiMessage } from "../helpers/apiMessages";
import { api, clearStoredAuth } from "../api";

import "../styles/managerDashboard.css";

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
  title?: string;
  message?: string;
  target_role?: "tenant" | "manager" | "all" | string | null;
  created_at?: string | null;
};

type NoticeContext = "general" | "actions" | "communication" | "payment";
type ManagerSectionKey = "units" | "actions" | "communication" | "payments";
type ManagerActionPanel = "assign-tenant" | "create-unit" | "remove-tenant" | null;

const MANAGER_ACTION_ROUTES = new Set<Exclude<ManagerActionPanel, null>>([
  "assign-tenant",
  "create-unit",
  "remove-tenant",
]);

type AssignTenantResponse = {
  message?: string;
  invitation?: {
    invitation_url?: string | null;
  } | null;
};

type InlineNotice = {
  key: string;
  text: string;
  tone: "success" | "error";
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
  const { actionType } = useParams<{ actionType?: string }>();
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
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inlineNotice, setInlineNotice] = useState<InlineNotice | null>(null);
  const [noticeContext, setNoticeContext] = useState<NoticeContext>("general");
  const [invitePreviewUrl, setInvitePreviewUrl] = useState("");
  const [activeOverviewSection, setActiveOverviewSection] = useState<ManagerSectionKey>("units");
  const [activeManagerPanel, setActiveManagerPanel] = useState<ManagerActionPanel>(null);
  const [complaintSearchTerm, setComplaintSearchTerm] = useState("");
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<"all" | ComplaintItem["status"]>("all");
  const [complaintPriorityFilter, setComplaintPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | PaymentReportItem["status"]>("all");
  const [unitForm, setUnitForm] = useState<{
    unit_number: string;
    floor: string;
    rent_amount: string;
    status: "vacant" | "occupied";
  }>({
    unit_number: "",
    floor: "",
    rent_amount: "",
    status: "vacant",
  });
  const [tenantForm, setTenantForm] = useState({
    unit_id: "",
    name: "",
    email: "",
    date_of_birth: "",
    move_in_date: "",
    lease_start: "",
    lease_end: "",
  });
  const [removeTenantUnitId, setRemoveTenantUnitId] = useState("");
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    target_role: "tenant",
  });
  const [replyMap, setReplyMap] = useState<Record<number, string>>({});
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [sendingReplyId, setSendingReplyId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [dashboardRes, complaintsRes, announcementsRes] = await Promise.all([
        api.manager.dashboard(),
        api.manager.complaints(),
        api.manager.announcements(),
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
        setFailure(getApiMessage(dashboardData, "Manager dashboard could not be loaded."), "general");
        setDashboard(null);
        setComplaints([]);
        setAnnouncements([]);
        setAnnouncementsCount(0);
        return;
      }

      const announcementList = (announcementsData?.data as AnnouncementItem[] | undefined) ?? [];

      setDashboard(dashboardData.data ?? null);
      setComplaints(complaintsData?.data ?? []);
      setAnnouncements(announcementList);
      setAnnouncementsCount(
        announcementList.filter(
          (item) => item.created_by === user?.id
        ).length
      );

      if (dashboardData.data === null) {
        setSuccess(dashboardData.message ?? "No property is assigned to this manager yet.", "general");
      }
    } catch {
      setFailure("Network error while loading manager dashboard.", "general");
    } finally {
      setLoading(false);
    }
  }, [navigate, user?.id]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    void loadDashboard();
  }, [loadDashboard, navigate, user]);

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

  useEffect(() => {
    if (!inlineNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInlineNotice((current) =>
        current?.key === inlineNotice.key ? null : current
      );
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inlineNotice]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const sections: Array<[ManagerSectionKey, HTMLElement | null]> = [
      ["units", unitOverviewRef.current],
      ["actions", managerActionsRef.current],
      ["communication", tenantCommunicationRef.current],
      ["payments", paymentSectionRef.current],
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visibleEntries.length === 0) {
          return;
        }

        const matchedSection = sections.find(([, element]) => element === visibleEntries[0].target);

        if (matchedSection) {
          setActiveOverviewSection(matchedSection[0]);
        }
      },
      {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: "-22% 0px -48% 0px",
      }
    );

    sections.forEach(([, element]) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!actionType) {
      setActiveManagerPanel(null);
      return;
    }

    if (MANAGER_ACTION_ROUTES.has(actionType as Exclude<ManagerActionPanel, null>)) {
      setActiveManagerPanel(actionType as Exclude<ManagerActionPanel, null>);
      setActiveOverviewSection("actions");
      return;
    }

    navigate("/dashboard-manager", { replace: true });
  }, [actionType, navigate]);

  useEffect(() => {
    if (!activeManagerPanel) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        navigate("/dashboard-manager", { replace: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeManagerPanel, navigate]);

  async function logout() {
    try {
      await api.auth.logout();
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
    setInvitePreviewUrl("");
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

  function showInlineNotice(
    key: string,
    text: string,
    tone: InlineNotice["tone"]
  ) {
    setInlineNotice({ key, text, tone });
  }

  function renderInlineNotice(key: string) {
    if (inlineNotice?.key !== key) {
      return null;
    }

    return (
      <>
        <div
          className={`manager-alert manager-section-alert ${inlineNotice.tone}`}
          style={{ marginTop: "12px", marginBottom: 0 }}
        >
          {inlineNotice.text}
        </div>
        {key === "assign-tenant" && invitePreviewUrl ? (
          <div
            className="manager-alert manager-section-alert success"
            style={{ marginTop: "10px", marginBottom: 0 }}
          >
            Invitation link for local testing: {invitePreviewUrl}
          </div>
        ) : null}
      </>
    );
  }

  function scrollToSection(section: ManagerSectionKey) {
    const sectionMap = {
      units: unitOverviewRef,
      actions: managerActionsRef,
      communication: tenantCommunicationRef,
      payments: paymentSectionRef,
    } as const;

    setActiveOverviewSection(section);
    sectionMap[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function openManagerActionPanel(panel: Exclude<ManagerActionPanel, null>) {
    navigate(`/dashboard-manager/actions/${panel}`);
  }

  function closeManagerActionPanel() {
    navigate("/dashboard-manager", { replace: true });
  }

  async function createUnit(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    try {
      const res = await api.manager.createUnit({
        ...unitForm,
        rent_amount: unitForm.rent_amount.trim() === "" ? null : Number(unitForm.rent_amount),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice("create-unit", getApiMessage(data, "Unit creation failed."), "error");
        return;
      }

      setUnitForm({
        unit_number: "",
        floor: "",
        rent_amount: "",
        status: "vacant",
      });
      showInlineNotice("create-unit", data?.message ?? "Unit created successfully.", "success");
      await loadDashboard();
    } catch {
      showInlineNotice("create-unit", "Network error while creating unit.", "error");
    }
  }

  async function assignTenant(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    if (!tenantForm.unit_id) {
      showInlineNotice("assign-tenant", "Please choose a unit first.", "error");
      return;
    }

    try {
      const res = await api.manager.assignTenant(tenantForm.unit_id, {
        ...tenantForm,
        date_of_birth: tenantForm.date_of_birth || null,
        move_in_date: tenantForm.move_in_date || null,
        lease_start: tenantForm.lease_start || null,
        lease_end: tenantForm.lease_end || null,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice("assign-tenant", getApiMessage(data, "Tenant assignment failed."), "error");
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
      showInlineNotice("assign-tenant", data?.message ?? "Tenant invitation sent successfully.", "success");
      await loadDashboard();
    } catch {
      showInlineNotice("assign-tenant", "Network error while assigning tenant.", "error");
    }
  }

  async function removeTenant() {
    clearNotice();

    if (!removeTenantUnitId) {
      showInlineNotice("remove-tenant", "Please choose an occupied unit first.", "error");
      return;
    }

    try {
      const res = await api.manager.removeTenant(removeTenantUnitId);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice("remove-tenant", getApiMessage(data, "Could not remove tenant."), "error");
        return;
      }

      setRemoveTenantUnitId("");
      showInlineNotice("remove-tenant", data?.message ?? "Tenant removed successfully.", "success");
      await loadDashboard();
    } catch {
      showInlineNotice("remove-tenant", "Network error while removing tenant.", "error");
    }
  }

  async function updateComplaintStatus(id: number, status: string) {
    clearNotice();

    try {
      const res = await api.manager.updateComplaint(id, status);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice(`complaint-status-${id}`, getApiMessage(data, "Complaint update failed."), "error");
        return;
      }

      showInlineNotice(`complaint-status-${id}`, data?.message ?? "Complaint updated successfully.", "success");
      await loadDashboard();
    } catch {
      showInlineNotice(`complaint-status-${id}`, "Network error while updating complaint.", "error");
    }
  }

  async function publishAnnouncement(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    try {
      const res = await api.manager.publishAnnouncement(announcementForm);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice("publish-announcement", getApiMessage(data, "Announcement could not be published."), "error");
        return;
      }

      setAnnouncementForm({
        title: "",
        message: "",
        target_role: "tenant",
      });
      showInlineNotice("publish-announcement", data?.message ?? "Announcement published successfully.", "success");
      await loadDashboard();
    } catch {
      showInlineNotice("publish-announcement", "Network error while publishing announcement.", "error");
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
      showInlineNotice(`complaint-tools-${complaint.id}`, "Generate or write a reply before sending it to the tenant.", "error");
      return;
    }

    setSendingReplyId(complaint.id);
    clearNotice();

    try {
      const res = await api.manager.replyToComplaint(complaint.id, managerReply);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice(`complaint-tools-${complaint.id}`, getApiMessage(data, "Could not send the reply to the tenant."), "error");
        return;
      }

      setReplyMap((prev) => ({
        ...prev,
        [complaint.id]: data?.data?.manager_reply ?? managerReply,
      }));
      showInlineNotice(`complaint-tools-${complaint.id}`, data?.message ?? "Reply sent to tenant successfully.", "success");
      await loadDashboard();
    } catch {
      showInlineNotice(`complaint-tools-${complaint.id}`, "Network error while sending reply to the tenant.", "error");
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
      showInlineNotice(`complaint-tools-${complaintId}`, "AI reply copied to clipboard.", "success");
    } catch {
      showInlineNotice(`complaint-tools-${complaintId}`, "Could not copy the AI reply.", "error");
    }
  }

  const property = dashboard?.property ?? null;
  const units = property?.units ?? [];
  const occupiedUnits = units.filter((unit) => unit.status === "occupied");
  const assignableUnits = units.filter((unit) => {
    if (unit.status === "vacant") {
      return true;
    }

    const activeTenant = unit.tenants?.find((tenant) => tenant.unit_id !== null);
    return activeTenant?.user?.status === "inactive";
  });
  const paymentReport = dashboard?.payments ?? [];
  const leaseDatesInvalid =
    !!tenantForm.lease_start &&
    !!tenantForm.lease_end &&
    new Date(tenantForm.lease_end).getTime() < new Date(tenantForm.lease_start).getTime();
  const filteredComplaints = complaints.filter((complaint) => {
    const normalizedSearch = complaintSearchTerm.trim().toLowerCase();
    const tenantName = complaint.tenant?.user?.name?.toLowerCase() ?? "";
    const unitNumber = complaint.unit?.unit_number?.toLowerCase() ?? "";
    const haystack = [
      complaint.title,
      complaint.description,
      complaint.category ?? "",
      tenantName,
      unitNumber,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchesStatus = complaintStatusFilter === "all" || complaint.status === complaintStatusFilter;
    const matchesPriority =
      complaintPriorityFilter === "all" ||
      (complaint.priority ?? "medium").toLowerCase() === complaintPriorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });
  const filteredPaymentReport = paymentReport.filter((payment) => {
    const normalizedSearch = paymentSearchTerm.trim().toLowerCase();
    const tenantName = payment.tenant?.user?.name?.toLowerCase() ?? "";
    const unitNumber = payment.unit?.unit_number?.toLowerCase() ?? "";
    const monthLabel = formatMonth(payment.payment_month).toLowerCase();
    const haystack = [tenantName, unitNumber, monthLabel, payment.status].join(" ").toLowerCase();

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    const matchesStatus = paymentStatusFilter === "all" || payment.status === paymentStatusFilter;

    return matchesSearch && matchesStatus;
  });
  const recentAnnouncements = [...announcements]
    .sort((left, right) => {
      const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 4);
  const selectedRemoveUnit = occupiedUnits.find((unit) => String(unit.id) === removeTenantUnitId) ?? null;
  const complaintFiltersActive =
    complaintSearchTerm.trim() !== "" ||
    complaintStatusFilter !== "all" ||
    complaintPriorityFilter !== "all";
  const paymentFiltersActive = paymentSearchTerm.trim() !== "" || paymentStatusFilter !== "all";
  const isManagerActionPage = activeManagerPanel !== null;

  function renderManagerActionPanel() {
    if (activeManagerPanel === "assign-tenant") {
      return (
        <form
          className="dashboard-panel dashboard-side-panel manager-form assign-tenant-form manager-action-panel manager-action-modal-card"
          onSubmit={assignTenant}
        >
          <div className="manager-action-modal-header">
            <div>
              <div className="manager-action-modal-badge">Manager Action</div>
              <h3>Send Tenant Invitation</h3>
              <p className="manager-form-subtitle">
                Save the tenant details and email an invitation so the tenant can set a password securely.
              </p>
            </div>
            <button
              type="button"
              className="manager-action-modal-close"
              onClick={closeManagerActionPanel}
            >
              Close
            </button>
          </div>
          <div className="manager-quick-pills">
            <span className="manager-property-pill">{assignableUnits.length} assignable unit</span>
            <span className="manager-property-pill">{occupiedUnits.length} occupied unit</span>
          </div>
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
            >
              <option value="">Choose unit</option>
              {assignableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  Unit {unit.unit_number}{unit.floor ? ` | Floor ${unit.floor}` : ""}
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
          {leaseDatesInvalid ? (
            <div className="manager-alert manager-section-alert error" style={{ marginBottom: 0 }}>
              Lease end date cannot be earlier than lease start date.
            </div>
          ) : null}
          <button className="action-btn" type="submit" disabled={!property || leaseDatesInvalid}>
            Send Invitation
          </button>
          {renderInlineNotice("assign-tenant")}
        </form>
      );
    }

    if (activeManagerPanel === "create-unit") {
      return (
        <form
          className="dashboard-panel dashboard-side-panel manager-form manager-action-panel manager-action-modal-card"
          onSubmit={createUnit}
        >
          <div className="manager-action-modal-header">
            <div>
              <div className="manager-action-modal-badge">Manager Action</div>
              <h3>Add Unit Details</h3>
              <p className="manager-form-subtitle">
                Add a new unit with rent and occupancy details for this property.
              </p>
            </div>
            <button
              type="button"
              className="manager-action-modal-close"
              onClick={closeManagerActionPanel}
            >
              Close
            </button>
          </div>
          <div className="manager-quick-pills">
            <span className="manager-property-pill">{units.length} total unit</span>
            <span className="manager-property-pill">{assignableUnits.length} ready to assign</span>
          </div>
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
            max="99999999.99"
            step="0.01"
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
          {renderInlineNotice("create-unit")}
        </form>
      );
    }

    if (activeManagerPanel === "remove-tenant") {
      return (
        <div className="dashboard-panel dashboard-side-panel manager-form remove-tenant-form manager-action-panel manager-action-modal-card">
          <div className="manager-action-modal-header">
            <div>
              <div className="manager-action-modal-badge">Manager Action</div>
              <h3>Remove Tenant</h3>
              <p className="manager-form-subtitle">
                Choose an occupied unit to deactivate the tenant login without leaving this page.
              </p>
            </div>
            <button
              type="button"
              className="manager-action-modal-close"
              onClick={closeManagerActionPanel}
            >
              Close
            </button>
          </div>
          <div className="manager-quick-pills">
            <span className="manager-property-pill">{occupiedUnits.length} occupied unit</span>
          </div>
          <select
            className="manager-input manager-select-input"
            value={removeTenantUnitId}
            onChange={(e) => setRemoveTenantUnitId(e.target.value)}
          >
            <option value="">Choose occupied unit</option>
            {occupiedUnits.map((unit) => {
              const activeTenant = unit.tenants?.find((tenant) => tenant.unit_id !== null);

              return (
                <option key={unit.id} value={unit.id}>
                  Unit {unit.unit_number} | {activeTenant?.user?.name ?? "Assigned tenant"}
                </option>
              );
            })}
          </select>
          {selectedRemoveUnit ? (
            <div className="manager-inline-hint">
              Selected unit {selectedRemoveUnit.unit_number} will remove the current tenant login access.
            </div>
          ) : null}
          <button
            type="button"
            className="remove-tenant-btn"
            onClick={() => void removeTenant()}
            disabled={!property}
          >
            Delete Tenant Login
          </button>
          {renderInlineNotice("remove-tenant")}
        </div>
      );
    }

    return null;
  }

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
                className={`manager-overview-action-btn ${activeOverviewSection === "units" ? "active" : ""}`}
                onClick={() => scrollToSection("units")}
              >
                Unit Overview
              </button>
              <button
                type="button"
                className={`manager-overview-action-btn ${activeOverviewSection === "actions" ? "active" : ""}`}
                onClick={() => scrollToSection("actions")}
              >
                Manager Actions
              </button>
              <button
                type="button"
                className={`manager-overview-action-btn ${activeOverviewSection === "communication" ? "active" : ""}`}
                onClick={() => scrollToSection("communication")}
              >
                Tenant Communication
              </button>
              <button
                type="button"
                className={`manager-overview-action-btn ${activeOverviewSection === "payments" ? "active" : ""}`}
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
            <p>
              {isManagerActionPage
                ? "This action is open in a focused interface. Close it anytime to return to the dashboard."
                : "Choose an action box to open a focused interface for that task."}
            </p>
          </div>

          <div className="manager-action-switcher">
            <button
              type="button"
              className={`manager-action-toggle ${activeManagerPanel === "assign-tenant" ? "active" : ""}`}
              onClick={() => openManagerActionPanel("assign-tenant")}
            >
              <span className="manager-action-toggle-title">Send Tenant Invitation</span>
              <span className="manager-action-toggle-meta">{assignableUnits.length} unit ready</span>
            </button>
            <button
              type="button"
              className={`manager-action-toggle ${activeManagerPanel === "create-unit" ? "active" : ""}`}
              onClick={() => openManagerActionPanel("create-unit")}
            >
              <span className="manager-action-toggle-title">Add Unit Details</span>
              <span className="manager-action-toggle-meta">{units.length} total unit</span>
            </button>
            <button
              type="button"
              className={`manager-action-toggle ${activeManagerPanel === "remove-tenant" ? "active" : ""}`}
              onClick={() => openManagerActionPanel("remove-tenant")}
            >
              <span className="manager-action-toggle-title">Remove Tenant</span>
              <span className="manager-action-toggle-meta">{occupiedUnits.length} occupied unit</span>
            </button>
          </div>

          {activeManagerPanel === null ? (
            <div className="dashboard-panel manager-collapsed-hint">
              <p className="empty-text">Pick an action card above to open that tool in a popup interface.</p>
            </div>
          ) : null}
        </section>

        <section className="tenant-communication-section" ref={tenantCommunicationRef}>
          <div className="tenant-communication-header">
            <div className="tenant-communication-badge">Tenant Communication</div>
            <h3>Complaints and Announcements</h3>
            <p>Review tenant complaints on the left and publish tenant announcements on the right.</p>
          </div>

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
                  {filteredComplaints.length} of {complaints.length} complaint{complaints.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="manager-filter-bar">
                <input
                  type="text"
                  className="table-search-input manager-filter-search"
                  placeholder="Search complaint, tenant, unit..."
                  value={complaintSearchTerm}
                  onChange={(e) => setComplaintSearchTerm(e.target.value)}
                />
                <select
                  className="manager-input manager-select-input manager-filter-select"
                  value={complaintStatusFilter}
                  onChange={(e) =>
                    setComplaintStatusFilter(e.target.value as "all" | ComplaintItem["status"])
                  }
                >
                  <option value="all">All status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <select
                  className="manager-input manager-select-input manager-filter-select"
                  value={complaintPriorityFilter}
                  onChange={(e) =>
                    setComplaintPriorityFilter(e.target.value as "all" | "high" | "medium" | "low")
                  }
                >
                  <option value="all">All priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                {complaintFiltersActive ? (
                  <button
                    type="button"
                    className="table-action-btn manager-clear-btn"
                    onClick={() => {
                      setComplaintSearchTerm("");
                      setComplaintStatusFilter("all");
                      setComplaintPriorityFilter("all");
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              {loading ? (
                <p className="empty-text">Loading complaints...</p>
              ) : filteredComplaints.length === 0 ? (
                <p className="empty-text">
                  {complaintFiltersActive
                    ? "No complaints match the current filters."
                    : "No complaints submitted in this property."}
                </p>
              ) : (
                <div className="complaints-list">
                  {filteredComplaints.map((complaint) => (
                    <div key={complaint.id} className="complaint-item">
                      <div className="complaint-top">
                        <div className="complaint-copy">
                          <h4>{complaint.title}</h4>
                          <p>
                            Unit {complaint.unit?.unit_number ?? "-"} | {complaint.tenant?.user?.name ?? "Tenant"}
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
                        Category: {complaint.category || "General"} | Submitted {formatRelative(complaint.created_at)}
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
                      {renderInlineNotice(`complaint-status-${complaint.id}`)}

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
                            {renderInlineNotice(`complaint-tools-${complaint.id}`)}
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
              {renderInlineNotice("publish-announcement")}
            </form>

            <div className="dashboard-panel dashboard-side-panel manager-preview-panel">
              <div className="table-header-row">
                <h3>Recent Announcements</h3>
                <span style={{ color: "#9cb8d0", fontSize: "13px", fontWeight: 600 }}>
                  {recentAnnouncements.length} recent
                </span>
              </div>

              {recentAnnouncements.length === 0 ? (
                <p className="empty-text">No announcements published yet.</p>
              ) : (
                <div className="manager-preview-list">
                  {recentAnnouncements.map((announcement) => (
                    <article key={announcement.id} className="manager-preview-card">
                      <div className="manager-preview-top">
                        <div>
                          <h4>{announcement.title ?? "Untitled announcement"}</h4>
                          <p className="manager-preview-meta">
                            Audience: {titleCase(announcement.target_role ?? "tenant")}
                          </p>
                        </div>
                        <span className="manager-preview-date">
                          {formatDate(announcement.created_at)}
                        </span>
                      </div>
                      <p>{announcement.message ?? "No announcement message."}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
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
                {paidPaymentsCount} paid, {filteredPaymentReport.length} visible
              </span>
            </div>

            <div className="manager-filter-bar">
              <input
                type="text"
                className="table-search-input manager-filter-search"
                placeholder="Search tenant, unit, month..."
                value={paymentSearchTerm}
                onChange={(e) => setPaymentSearchTerm(e.target.value)}
              />
              <select
                className="manager-input manager-select-input manager-filter-select"
                value={paymentStatusFilter}
                onChange={(e) =>
                  setPaymentStatusFilter(e.target.value as "all" | PaymentReportItem["status"])
                }
              >
                <option value="all">All status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
              </select>
              {paymentFiltersActive ? (
                <button
                  type="button"
                  className="table-action-btn manager-clear-btn"
                  onClick={() => {
                    setPaymentSearchTerm("");
                    setPaymentStatusFilter("all");
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {!property ? (
              <p className="empty-text">Assign a property first to see rent payment reports.</p>
            ) : loading ? (
              <p className="empty-text">Loading payment reports...</p>
            ) : filteredPaymentReport.length === 0 ? (
              <p className="empty-text">
                {paymentFiltersActive
                  ? "No payment record matches the current filters."
                  : "No rent payment records have been saved for this property yet."}
              </p>
            ) : (
              <div className="payment-report-list">
                {filteredPaymentReport.map((payment) => (
                  <article key={payment.id} className="payment-report-card">
                    <div className="payment-report-top">
                      <div className="payment-report-copy">
                        <h4>{payment.tenant?.user?.name ?? "Tenant payment"}</h4>
                        <p className="payment-report-subtitle">
                          {payment.unit?.apartment?.name ?? property?.name ?? "Assigned property"} | Unit{" "}
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

      {activeManagerPanel ? (
        <div
          className="manager-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeManagerActionPanel();
            }
          }}
        >
          <div className="manager-modal-shell" onMouseDown={(event) => event.stopPropagation()}>
            {renderManagerActionPanel()}
          </div>
        </div>
      ) : null}
    </div>
  );
}












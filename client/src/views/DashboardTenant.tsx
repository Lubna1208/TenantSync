import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getApiMessage } from "../helpers/apiMessages";
import { api, clearStoredAuth } from "../api";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;
const CHAT_SYSTEM_PROMPT = `You are a helpful tenant support assistant for a property management platform called TenantSync.
You only answer questions related to renting, property management, and tenant life.
Keep answers concise, friendly, and professional.

Common questions you handle:
- Rent due dates: "Rent is typically due on the 1st of each month. Check your lease or contact your property manager for your specific due date."
- How to report maintenance: "You can submit a maintenance complaint directly from your TenantSync dashboard using the 'Submit Complaint' button. Fill in the title, category, priority, and description."
- Office hours: "Office hours vary by property. Contact your property manager through the dashboard announcements section or ask here and I'll do my best to help."
- Lease questions, payment status, unit information: guide the tenant to check their dashboard or contact their manager.

If asked about anything unrelated to property management or tenancy, politely decline and redirect.`;
const CHAT_WELCOME_MESSAGE = "Hello! I'm your TenantSync support assistant. How can I help you today?";

type User = {
  id: number;
  name: string;
  email: string;
  date_of_birth?: string | null;
  role?: string;
  status?: string;
};

type DashboardComplaint = {
  id: number;
  title: string;
  description: string;
  category?: string | null;
  priority?: string | null;
  status: "open" | "in_progress" | "resolved";
  manager_reply?: string | null;
  manager_reply_sent_at?: string | null;
  created_at: string;
};

type DashboardAnnouncement = {
  id: number;
  title: string;
  message: string;
  created_at: string;
  creator?: {
    name: string;
  } | null;
};

type DashboardPayment = {
  id: number;
  amount: number;
  currency?: string | null;
  payment_month: string;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_method?: string | null;
  status: "paid" | "unpaid" | "pending";
  payment_date?: string | null;
  paid_at?: string | null;
  failure_reason?: string | null;
  receipt_url?: string | null;
};

type DashboardUnit = {
  id: number;
  unit_number: string;
  floor?: string | null;
  rent_amount: number;
};

type DashboardProperty = {
  id: number;
  name: string;
  address: string;
};

type DashboardTenantProfile = {
  id: number;
  lease_start?: string | null;
  lease_end?: string | null;
  move_in_date?: string | null;
};

type DashboardResponse = {
  tenant: DashboardTenantProfile;
  property?: DashboardProperty | null;
  unit?: DashboardUnit | null;
  latest_payment?: DashboardPayment | null;
  next_due_date?: string | null;
  complaints: DashboardComplaint[];
  announcements: DashboardAnnouncement[];
};

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

type TenantActionPanel = "complaints" | "announcements";

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type InlineNotice = {
  key: string;
  text: string;
  tone: "success" | "error";
};

async function generateGeminiText(contents: GeminiContent[]) {
  let lastErrorMessage = "Gemini API request failed.";

  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
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
  if (!value) return "Not available";

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
  const now = new Date();
  const date = new Date(value);
  const diff = now.getTime() - date.getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));

  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatStatus(value: string) {
  return value.split("_").join(" ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function complaintReplyLabel(status: DashboardComplaint["status"]) {
  if (status === "resolved") {
    return "Resolved Update";
  }

  if (status === "in_progress") {
    return "Work In Progress";
  }

  return "Manager Reply";
}

export default function DashboardTenant() {
  const navigate = useNavigate();
  const processedCheckoutSessionRef = useRef<string | null>(null);
  const paymentSectionRef = useRef<HTMLElement | null>(null);
  const complaintHistoryRef = useRef<HTMLDivElement | null>(null);
  const announcementsRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inlineNotice, setInlineNotice] = useState<InlineNotice | null>(null);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [activeTenantPanel, setActiveTenantPanel] = useState<TenantActionPanel | null>(null);
  const [complaintForm, setComplaintForm] = useState({
    title: "",
    category: "",
    priority: "medium",
    description: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [isPayingRent, setIsPayingRent] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    void loadDashboard();
  }, [user, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("payment") ?? params.get("checkout");
    const sessionId = params.get("session_id");

    if (checkoutStatus === "cancelled") {
      clearCheckoutParams();
      showInlineNotice("pay-rent", "Payment was cancelled.", "error");
      void loadDashboard();
      return;
    }

    if (checkoutStatus !== "success" || !sessionId) {
      return;
    }

    if (processedCheckoutSessionRef.current === sessionId) {
      return;
    }

    processedCheckoutSessionRef.current = sessionId;
    void verifyPayment(sessionId);
  }, [user]);

  useEffect(() => {
    if (!inlineNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInlineNotice((current) =>
        current?.key === inlineNotice.key ? null : current
      );
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [inlineNotice]);

  useEffect(() => {
    if (!showComplaintForm) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowComplaintForm(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showComplaintForm]);

  useEffect(() => {
    if (!activeTenantPanel) {
      return;
    }

    const panelRef =
      activeTenantPanel === "complaints" ? complaintHistoryRef : announcementsRef;

    panelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeTenantPanel]);

  function clearCheckoutParams() {
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    url.searchParams.delete("checkout");
    url.searchParams.delete("session_id");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const res = await api.tenant.dashboard();

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        localStorage.removeItem("ts_user");
        localStorage.removeItem("ts_token");
        sessionStorage.removeItem("ts_user");
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok || !data) {
        setError(getApiMessage(data, "Tenant dashboard could not be loaded."));
        setDashboard(null);
        return;
      }

      setDashboard(data.data ?? null);
      if (!data.data) {
        setMessage(data.message ?? "Tenant profile is not assigned yet.");
      }
    } catch {
      setError("Network error while loading tenant dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.auth.logout();
    } catch {
      // ignore logout failure
    }

    clearStoredAuth();
    setUser(null);
    navigate("/login", { replace: true });
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
      <div
        style={{
          ...styles.inlineActionNotice,
          ...(inlineNotice.tone === "error"
            ? styles.inlineActionNoticeError
            : styles.inlineActionNoticeSuccess),
        }}
      >
        {inlineNotice.text}
      </div>
    );
  }

  function scrollToPaymentSection() {
    paymentSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function payRent() {
    setIsPayingRent(true);

    try {
      const res = await api.tenant.createCheckoutSession();

      const data = await res.json().catch(() => null);
      const checkoutUrl = data?.url;

      if (res.status === 401) {
        clearStoredAuth();
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok || typeof checkoutUrl !== "string" || !checkoutUrl) {
        showInlineNotice("pay-rent", getApiMessage(data, "Checkout session could not be created."), "error");
        return;
      }

      window.location.assign(checkoutUrl);
    } catch {
      showInlineNotice("pay-rent", "Network error while starting payment.", "error");
    } finally {
      setIsPayingRent(false);
    }
  }

  async function verifyPayment(sessionId: string) {
    setIsPayingRent(true);

    try {
      const res = await api.tenant.verifyPayment(sessionId);

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        clearStoredAuth();
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        showInlineNotice("pay-rent", getApiMessage(data, "Could not verify payment status."), "error");
        return;
      }

      clearCheckoutParams();
      await loadDashboard();
      showInlineNotice("pay-rent", data?.message ?? "Payment verification complete.", "success");
    } catch {
      showInlineNotice("pay-rent", "Could not verify payment status.", "error");
    } finally {
      setIsPayingRent(false);
    }
  }

  async function submitComplaint(e: FormEvent) {
    e.preventDefault();
    setIsSubmittingComplaint(true);

    try {
      const res = await api.tenant.submitComplaint(complaintForm);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice("submit-complaint", getApiMessage(data, "Complaint could not be submitted."), "error");
        return;
      }

      setComplaintForm({
        title: "",
        category: "",
        priority: "medium",
        description: "",
      });
      setActiveTenantPanel("complaints");
      setShowComplaintForm(false);
      showInlineNotice("submit-complaint", data?.message ?? "Complaint submitted successfully.", "success");
      await loadDashboard();
    } catch {
      showInlineNotice("submit-complaint", "Network error while submitting complaint.", "error");
    } finally {
      setIsSubmittingComplaint(false);
    }
  }

  async function submitPasswordChange(e: FormEvent) {
    e.preventDefault();
    setIsUpdatingPassword(true);

    try {
      const res = await api.auth.changePassword(passwordForm);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showInlineNotice("change-password", getApiMessage(data, "Password could not be updated."), "error");
        return;
      }

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      showInlineNotice("change-password", data?.message ?? "Password updated successfully.", "success");
    } catch {
      showInlineNotice("change-password", "Network error while updating password.", "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  function openChat() {
    setChatOpen(true);
    setChatMessages([{ role: "model", text: CHAT_WELCOME_MESSAGE }]);
    setChatInput("");
  }

  function closeChat() {
    setChatOpen(false);
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
  }

  async function sendChatMessage(e?: FormEvent) {
    e?.preventDefault();

    const trimmedInput = chatInput.trim();
    if (!trimmedInput || chatLoading) {
      return;
    }

    const nextUserMessage: ChatMessage = { role: "user", text: trimmedInput };
    const nextMessages = [...chatMessages, nextUserMessage];

    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is missing.");
      }

      const contents: GeminiContent[] = [
        { role: "user", parts: [{ text: CHAT_SYSTEM_PROMPT }] },
        ...nextMessages.map((message) => ({
          role: message.role,
          parts: [{ text: message.text }],
        })),
      ];

      const reply = await generateGeminiText(contents);
      setChatMessages((current) => [...current, { role: "model", text: reply }]);
    } catch (err) {
      const fallback =
        err instanceof Error && err.message === "Gemini API key is missing."
          ? "Gemini support is not configured yet. Add VITE_GEMINI_API_KEY in client/.env."
          : "Sorry, the AI assistant is unavailable right now. Please try again.";

      setChatMessages((current) => [...current, { role: "model", text: fallback }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (!user) return null;

  const latestPayment = dashboard?.latest_payment ?? null;
  const latestComplaint = dashboard?.complaints?.[0] ?? null;
  const unit = dashboard?.unit ?? null;
  const property = dashboard?.property ?? null;
  const tenant = dashboard?.tenant ?? null;
  const dueMonth = formatMonth(dashboard?.next_due_date?.slice(0, 7) ?? latestPayment?.payment_month);
  const paymentAmount = formatCurrency(
    latestPayment?.amount ?? unit?.rent_amount ?? 0,
    latestPayment?.currency ?? "bdt"
  );
  const paymentStatusLabel = formatStatus(latestPayment?.status ?? "unpaid");
  const paymentStatusStyle =
    latestPayment?.status === "paid"
      ? styles.badgePaid
      : latestPayment?.status === "pending"
        ? styles.badgePending
        : styles.badgeWarning;
  const receiptUrl = latestPayment?.receipt_url ?? null;
  const paymentFailure = latestPayment?.failure_reason ?? "";
  const paymentMethod = latestPayment?.payment_method ? formatStatus(latestPayment.payment_method) : "Stripe Checkout";

  const statCards = [
    {
      label: "Current Rent",
      value: `Tk ${Number(latestPayment?.amount ?? unit?.rent_amount ?? 0).toLocaleString()}`,
      note: formatMonth(latestPayment?.payment_month),
    },
    {
      label: "Complaint Status",
      value: latestComplaint ? formatStatus(latestComplaint.status) : "No Issue",
      note: latestComplaint
        ? `Updated ${formatRelative(latestComplaint.created_at)}`
        : "Everything looks quiet",
    },
    {
      label: "Assigned Unit",
      value: unit?.unit_number ? `Unit ${unit.unit_number}` : "Pending",
      note: property?.name ?? "Awaiting assignment",
    },
    {
      label: "Lease End",
      value: tenant?.lease_end ? formatDate(tenant.lease_end) : "Not Scheduled",
      note: `Move in ${formatDate(tenant?.move_in_date)}`,
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowTop} />
      <div style={styles.backgroundGlowBottom} />

      <div style={styles.shell}>
        <section style={styles.hero}>
          <div style={styles.heroCopy}>
            <div style={styles.eyebrow}>Tenant Console</div>
            <h1 style={styles.heroTitle}>Stay on top of your home, rent, and support</h1>
            <p style={styles.heroText}>
              {unit
                ? `You are connected to ${property?.name ?? "your property"}, unit ${unit.unit_number}${unit.floor ? ` on floor ${unit.floor}` : ""}. Track rent, submit issues, and follow updates from one dashboard.`
                : "Your account is active. Once your property and unit are assigned, this page will automatically fill with your tenant details."}
            </p>

            <div style={styles.heroMiniGrid}>
              <div style={styles.heroMiniCard}>
                <span style={styles.heroMiniLabel}>Property</span>
                <strong style={styles.heroMiniValue}>{property?.name ?? "Pending"}</strong>
              </div>
              <div style={styles.heroMiniCard}>
                <span style={styles.heroMiniLabel}>Next Due</span>
                <strong style={styles.heroMiniValue}>{formatDate(dashboard?.next_due_date)}</strong>
              </div>
            </div>
          </div>

          <div style={styles.profileCard}>
            <div style={styles.profileTopRow}>
              <div style={styles.profileIdentity}>
                <div style={styles.avatar}>{user.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div style={styles.profileName}>{user.name}</div>
                  <div style={styles.profileMeta}>{user.email}</div>
                </div>
              </div>
              <button style={styles.logoutTopBtn} onClick={logout}>
                Logout
              </button>
            </div>

            <div style={styles.profileActionRow}>
              <button
                type="button"
                style={styles.profileEditBtn}
                onClick={() => setShowPasswordForm((current) => !current)}
              >
                {showPasswordForm ? "Close Password Editor" : "Edit Password"}
              </button>
            </div>

            <div style={styles.profileInfoGrid}>
              <div style={styles.profileInfoItem}>
                <span style={styles.profileInfoLabel}>Move In</span>
                <strong style={styles.profileInfoValue}>
                  {tenant?.move_in_date ? formatDate(tenant.move_in_date) : "Pending"}
                </strong>
              </div>
              <div style={styles.profileInfoItem}>
                <span style={styles.profileInfoLabel}>Lease Start</span>
                <strong style={styles.profileInfoValue}>{formatDate(tenant?.lease_start)}</strong>
              </div>
              <div style={styles.profileInfoItem}>
                <span style={styles.profileInfoLabel}>Address</span>
                <strong style={styles.profileInfoValue}>{property?.address ?? "Not available"}</strong>
              </div>
            </div>
          </div>
        </section>

        {(message || error) && (
          <div
            style={{
              ...styles.notice,
              ...(error ? styles.noticeError : styles.noticeSuccess),
            }}
          >
            {error || message}
          </div>
        )}

        {loading ? (
          <section style={styles.panel}>
            <p style={styles.emptyText}>Loading tenant dashboard...</p>
          </section>
        ) : !dashboard ? (
          <section style={styles.panel}>
            <div style={styles.sectionBadge}>Tenant Status</div>
            <h2 style={styles.sectionTitle}>Assignment Pending</h2>
            <p style={styles.emptyText}>
              Your tenant account exists, but no building or unit has been assigned yet.
            </p>
            <button onClick={logout} style={styles.logoutBtn}>
              Logout
            </button>
          </section>
        ) : (
          <>
            {showPasswordForm && (
              <form style={styles.panel} onSubmit={submitPasswordChange}>
                <div style={styles.sectionBadge}>Profile Security</div>
                <h2 style={styles.sectionTitle}>Change Password</h2>
                <p style={styles.sectionLead}>
                  Enter your current password, then save a new one. Your previous password will be replaced in the database.
                </p>
                <div style={styles.passwordGrid}>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Current password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm((current) => ({
                        ...current,
                        current_password: e.target.value,
                      }))
                    }
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="New password"
                    value={passwordForm.password}
                    onChange={(e) =>
                      setPasswordForm((current) => ({
                        ...current,
                        password: e.target.value,
                      }))
                    }
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordForm.password_confirmation}
                    onChange={(e) =>
                      setPasswordForm((current) => ({
                        ...current,
                        password_confirmation: e.target.value,
                      }))
                    }
                  />
                </div>
                <button style={styles.submitBtn} type="submit" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? "Updating..." : "Save New Password"}
                </button>
                {renderInlineNotice("change-password")}
              </form>
            )}

            <section style={styles.actionPanel}>
              <div style={styles.sectionBadge}>Tenant Actions</div>
              <div style={styles.actionPanelGrid}>
                <div style={styles.actionCardWrap}>
                  <button
                    style={{ ...styles.actionBtn, ...styles.primaryAction }}
                    onClick={() => void payRent()}
                    disabled={isPayingRent || !unit}
                  >
                    <span style={styles.actionTitle}>
                      {isPayingRent ? "Processing..." : "Pay with Stripe"}
                    </span>
                    <span style={styles.actionText}>
                      Open Stripe Checkout and pay your current rent from Stripe's secure hosted page.
                    </span>
                  </button>
                  {renderInlineNotice("pay-rent")}
                </div>

                <div style={styles.actionCardWrap}>
                  <button
                    style={{ ...styles.actionBtn, ...styles.secondaryAction }}
                    onClick={() => setShowComplaintForm(true)}
                    disabled={!unit}
                  >
                    <span style={styles.actionTitle}>Submit Complaint</span>
                    <span style={styles.actionText}>Send a maintenance or support request instantly.</span>
                  </button>
                  {!showComplaintForm ? renderInlineNotice("submit-complaint") : null}
                </div>

                <div style={styles.actionCardWrap}>
                  <button
                    type="button"
                    style={{
                      ...styles.actionBtn,
                      ...styles.secondaryAction,
                      ...(activeTenantPanel === "complaints" ? styles.activeAction : {}),
                    }}
                    onClick={() =>
                      setActiveTenantPanel((current) =>
                        current === "complaints" ? null : "complaints"
                      )
                    }
                  >
                    <span style={styles.actionTitle}>Complaint History</span>
                    <span style={styles.actionText}>
                      Show your previous complaints and manager replies only when needed.
                    </span>
                  </button>
                </div>

                <div style={styles.actionCardWrap}>
                  <button
                    type="button"
                    style={{
                      ...styles.actionBtn,
                      ...styles.secondaryAction,
                      ...(activeTenantPanel === "announcements" ? styles.activeAction : {}),
                    }}
                    onClick={() =>
                      setActiveTenantPanel((current) =>
                        current === "announcements" ? null : "announcements"
                      )
                    }
                  >
                    <span style={styles.actionTitle}>Announcements</span>
                    <span style={styles.actionText}>
                      Open the latest building updates only when you click this button.
                    </span>
                  </button>
                </div>

                <div style={styles.actionCardWrap}>
                  <button
                    style={{ ...styles.actionBtn, ...styles.secondaryAction }}
                    onClick={scrollToPaymentSection}
                  >
                    <span style={styles.actionTitle}>Rent Payment</span>
                    <span style={styles.actionText}>Open the payment detail section and review your latest rent status.</span>
                  </button>
                </div>
              </div>
            </section>

            <section style={styles.summaryGrid}>
              {statCards.map((item) => (
                <div key={item.label} style={styles.featureCard}>
                  <div style={styles.statIconWrap}>
                    <span style={styles.statIcon}>+</span>
                  </div>
                  <p style={styles.cardLabel}>{item.label}</p>
                  <h2 style={styles.amount}>{item.value}</h2>
                  <p style={styles.helperText}>{item.note}</p>
                </div>
              ))}
            </section>

            <section style={styles.panel} ref={paymentSectionRef}>
              <div style={styles.sectionHeadRow}>
                <div>
                  <div style={styles.sectionBadge}>Payment Details</div>
                  <h2 style={styles.sectionTitle}>Rent Payment</h2>
                </div>
                <span style={{ ...styles.badge, ...paymentStatusStyle }}>{paymentStatusLabel}</span>
              </div>

              <div style={styles.paymentInfoGrid}>
                <div style={styles.paymentInfoCard}>
                  <span style={styles.profileInfoLabel}>Rent Due</span>
                  <strong style={styles.paymentInfoValue}>{dueMonth}</strong>
                </div>
                <div style={styles.paymentInfoCard}>
                  <span style={styles.profileInfoLabel}>Amount</span>
                  <strong style={styles.paymentInfoValue}>{paymentAmount}</strong>
                </div>
                <div style={styles.paymentInfoCard}>
                  <span style={styles.profileInfoLabel}>Last Payment Date</span>
                  <strong style={styles.paymentInfoValue}>
                    {formatDate(latestPayment?.paid_at ?? latestPayment?.payment_date)}
                  </strong>
                </div>
                <div style={styles.paymentInfoCard}>
                  <span style={styles.profileInfoLabel}>Payment Method</span>
                  <strong style={styles.paymentInfoValue}>{paymentMethod}</strong>
                </div>
              </div>

              {receiptUrl ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.receiptLink}
                >
                  Open Stripe receipt
                </a>
              ) : null}

              {paymentFailure ? <p style={styles.paymentFailureText}>{paymentFailure}</p> : null}
            </section>

            {activeTenantPanel === "complaints" ? (
              <section style={styles.contentReveal}>
                <div style={styles.panel} ref={complaintHistoryRef}>
                  <div style={styles.sectionHeadRow}>
                    <div>
                      <div style={styles.sectionBadge}>Support History</div>
                      <h2 style={styles.sectionTitle}>Complaint History</h2>
                    </div>
                    <span style={styles.sectionChip}>{dashboard.complaints.length} total</span>
                  </div>

                  {dashboard.complaints.length === 0 ? (
                    <p style={styles.emptyText}>No complaints submitted yet.</p>
                  ) : (
                    <div style={styles.stack}>
                      {dashboard.complaints.map((complaint) => (
                        <article key={complaint.id} style={styles.listCard}>
                          <div style={styles.sectionHeadRow}>
                            <div>
                              <h3 style={styles.itemTitle}>{complaint.title}</h3>
                              <p style={styles.itemMeta}>{formatRelative(complaint.created_at)}</p>
                            </div>
                            <span
                              style={{
                                ...styles.badge,
                                ...(complaint.status === "resolved"
                                  ? styles.badgePaid
                                  : complaint.status === "in_progress"
                                    ? styles.badgeWarning
                                    : styles.badgePending),
                              }}
                            >
                              {formatStatus(complaint.status)}
                            </span>
                          </div>
                          <p style={styles.bodyText}>{complaint.description}</p>
                          <div style={styles.itemFooter}>
                            <span style={styles.inlineTag}>
                              {complaint.priority ? formatStatus(complaint.priority) : "Normal Priority"}
                            </span>
                            <span style={styles.inlineMeta}>{complaint.category || "General issue"}</span>
                          </div>

                          {complaint.manager_reply ? (
                            <div style={styles.replyCard}>
                              <div style={styles.replyHeader}>
                                <span style={styles.replyBadge}>{complaintReplyLabel(complaint.status)}</span>
                                <span style={styles.replyMeta}>
                                  {complaint.manager_reply_sent_at
                                    ? `Sent ${formatDate(complaint.manager_reply_sent_at)}`
                                    : "Sent by management"}
                                </span>
                              </div>
                              <p style={styles.replyBody}>{complaint.manager_reply}</p>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeTenantPanel === "announcements" ? (
              <section style={styles.contentReveal}>
                <div style={styles.panel} ref={announcementsRef}>
                  <div style={styles.sectionHeadRow}>
                    <div>
                      <div style={styles.sectionBadge}>Building Updates</div>
                      <h2 style={styles.sectionTitle}>Announcements</h2>
                    </div>
                    <span style={styles.sectionChip}>{dashboard.announcements.length} updates</span>
                  </div>

                  {dashboard.announcements.length === 0 ? (
                    <p style={styles.emptyText}>No announcements available yet.</p>
                  ) : (
                    <div style={styles.stack}>
                      {dashboard.announcements.map((item) => (
                        <article key={item.id} style={styles.listCard}>
                          <h3 style={styles.itemTitle}>{item.title}</h3>
                          <p style={styles.bodyText}>{item.message}</p>
                          <p style={styles.itemMeta}>
                            {item.creator?.name ?? "Management"} - {formatDate(item.created_at)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      {chatOpen ? (
        <div style={styles.chatPanel}>
          <div style={styles.chatHeader}>
            <div>
              <div style={styles.chatTitle}>TenantSync AI Support</div>
              <div style={styles.chatSubtitle}>Property help, maintenance, rent, and lease guidance</div>
            </div>
            <button type="button" style={styles.chatCloseButton} onClick={closeChat}>
              x
            </button>
          </div>

          <div style={styles.chatMessages}>
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  ...styles.chatMessageRow,
                  ...(message.role === "user" ? styles.chatMessageRowUser : styles.chatMessageRowModel),
                }}
              >
                <div
                  style={{
                    ...styles.chatBubble,
                    ...(message.role === "user" ? styles.chatBubbleUser : styles.chatBubbleModel),
                  }}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div style={styles.chatMessageRow}>
                <div style={{ ...styles.chatBubble, ...styles.chatBubbleModel }}>
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <form style={styles.chatComposer} onSubmit={sendChatMessage}>
            <input
              style={styles.chatInput}
              placeholder="Ask about rent, complaints, or lease help"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" style={styles.chatSendButton} disabled={chatLoading || !chatInput.trim()}>
              Send
            </button>
          </form>
        </div>
      ) : null}

      {showComplaintForm ? (
        <div
          style={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowComplaintForm(false);
            }
          }}
        >
          <form
            style={styles.complaintModal}
            onSubmit={submitComplaint}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={styles.modalHeaderRow}>
              <div>
                <div style={styles.sectionBadge}>Support Request</div>
                <h2 style={styles.sectionTitle}>Submit a Complaint</h2>
              </div>
              <button
                type="button"
                style={styles.modalCloseButton}
                onClick={() => setShowComplaintForm(false)}
              >
                Close
              </button>
            </div>
            <p style={styles.sectionLead}>
              Share the issue clearly so your manager can respond faster.
            </p>
            <div style={styles.formGrid}>
              <input
                style={styles.input}
                placeholder="Complaint title"
                value={complaintForm.title}
                onChange={(e) =>
                  setComplaintForm((current) => ({
                    ...current,
                    title: e.target.value,
                  }))
                }
              />
              <input
                style={styles.input}
                placeholder="Category"
                value={complaintForm.category}
                onChange={(e) =>
                  setComplaintForm((current) => ({
                    ...current,
                    category: e.target.value,
                  }))
                }
              />
              <select
                style={styles.input}
                value={complaintForm.priority}
                onChange={(e) =>
                  setComplaintForm((current) => ({
                    ...current,
                    priority: e.target.value,
                  }))
                }
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
            </div>
            <textarea
              style={styles.modalTextarea}
              placeholder="Describe the issue"
              value={complaintForm.description}
              onChange={(e) =>
                setComplaintForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
            />
            <div style={styles.modalActionsRow}>
              <button
                type="button"
                style={styles.modalSecondaryButton}
                onClick={() => setShowComplaintForm(false)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.submitBtn, ...styles.modalPrimaryButton }}
                type="submit"
                disabled={isSubmittingComplaint}
              >
                {isSubmittingComplaint ? "Submitting..." : "Send Complaint"}
              </button>
            </div>
            {renderInlineNotice("submit-complaint")}
          </form>
        </div>
      ) : null}

      <button type="button" style={styles.chatLauncher} onClick={openChat}>
        Chat
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background: "radial-gradient(circle at top, #14244c 0%, #0d1531 45%, #091021 100%)",
    padding: "28px",
    color: "#f4f7ff",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: "-180px",
    right: "-120px",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(38,210,255,0.22) 0%, rgba(38,210,255,0) 70%)",
    pointerEvents: "none",
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: "-180px",
    left: "-140px",
    width: "380px",
    height: "380px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(61,113,255,0.22) 0%, rgba(61,113,255,0) 70%)",
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1380px",
    margin: "0 auto",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.55fr) minmax(320px, 0.85fr)",
    gap: "22px",
    alignItems: "stretch",
    marginBottom: "24px",
  },
  heroCopy: {
    paddingTop: "10px",
  },
  eyebrow: {
    display: "inline-flex",
    padding: "10px 16px",
    borderRadius: "999px",
    background: "rgba(31, 91, 156, 0.46)",
    color: "#7ed7ff",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "18px",
    border: "1px solid rgba(109, 204, 255, 0.18)",
  },
  heroTitle: {
    margin: "0 0 12px",
    fontSize: "58px",
    lineHeight: 1.06,
    color: "#f8fbff",
  },
  heroText: {
    margin: 0,
    maxWidth: "760px",
    color: "#9eb4db",
    fontSize: "20px",
    lineHeight: 1.7,
  },
  heroMiniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    marginTop: "28px",
    maxWidth: "560px",
  },
  heroMiniCard: {
    padding: "18px 20px",
    borderRadius: "22px",
    background: "rgba(20, 29, 57, 0.72)",
    border: "1px solid rgba(179, 196, 230, 0.16)",
    boxShadow: "0 14px 34px rgba(3, 9, 25, 0.26)",
  },
  heroMiniLabel: {
    display: "block",
    fontSize: "12px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#73bef2",
    marginBottom: "10px",
    fontWeight: 700,
  },
  heroMiniValue: {
    fontSize: "22px",
    lineHeight: 1.3,
    color: "#ffffff",
  },
  profileCard: {
    background: "linear-gradient(180deg, rgba(26, 35, 64, 0.9) 0%, rgba(19, 28, 52, 0.94) 100%)",
    borderRadius: "28px",
    padding: "24px",
    border: "1px solid rgba(176, 193, 227, 0.16)",
    boxShadow: "0 24px 54px rgba(4, 10, 24, 0.28)",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },
  profileTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
  },
  profileIdentity: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  avatar: {
    width: "74px",
    height: "74px",
    borderRadius: "22px",
    background: "linear-gradient(135deg, #2c78ff 0%, #22d3ee 100%)",
    display: "grid",
    placeItems: "center",
    color: "#fdfefe",
    fontSize: "30px",
    fontWeight: 700,
    boxShadow: "0 16px 28px rgba(34, 211, 238, 0.24)",
  },
  profileName: {
    fontSize: "36px",
    fontWeight: 700,
    marginBottom: "6px",
    color: "#ffffff",
  },
  profileMeta: {
    color: "#97bee7",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  logoutTopBtn: {
    border: "1px solid rgba(100, 196, 255, 0.26)",
    borderRadius: "999px",
    background: "linear-gradient(135deg, rgba(27, 92, 162, 0.95), rgba(32, 162, 221, 0.95))",
    color: "#eaf9ff",
    padding: "12px 18px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  profileInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  profileActionRow: {
    display: "flex",
    justifyContent: "flex-start",
  },
  profileEditBtn: {
    border: "1px solid rgba(126, 215, 255, 0.2)",
    borderRadius: "999px",
    background: "rgba(13, 22, 43, 0.72)",
    color: "#8fd8ff",
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  profileInfoItem: {
    borderRadius: "20px",
    background: "rgba(12, 19, 38, 0.6)",
    border: "1px solid rgba(176, 193, 227, 0.12)",
    padding: "16px",
  },
  profileInfoLabel: {
    display: "block",
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7fadd9",
    marginBottom: "8px",
    fontWeight: 700,
  },
  profileInfoValue: {
    color: "#f8fbff",
    fontSize: "16px",
    lineHeight: 1.5,
  },
  notice: {
    borderRadius: "18px",
    padding: "15px 18px",
    marginBottom: "18px",
    fontWeight: 700,
    border: "1px solid transparent",
  },
  inlineActionNotice: {
    marginTop: "14px",
    borderRadius: "18px",
    padding: "14px 16px",
    fontWeight: 700,
    lineHeight: 1.6,
    border: "1px solid transparent",
  },
  inlineActionNoticeSuccess: {
    background: "rgba(12, 82, 57, 0.34)",
    color: "#a6f4cd",
    borderColor: "rgba(84, 196, 141, 0.28)",
  },
  inlineActionNoticeError: {
    background: "rgba(122, 24, 44, 0.3)",
    color: "#ffc3ce",
    borderColor: "rgba(255, 135, 158, 0.22)",
  },
  noticeSuccess: {
    background: "rgba(12, 82, 57, 0.34)",
    color: "#a6f4cd",
    borderColor: "rgba(84, 196, 141, 0.28)",
  },
  noticeError: {
    background: "rgba(122, 24, 44, 0.3)",
    color: "#ffc3ce",
    borderColor: "rgba(255, 135, 158, 0.22)",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "20px",
  },
  featureCard: {
    background: "rgba(24, 33, 61, 0.9)",
    borderRadius: "26px",
    padding: "22px",
    border: "1px solid rgba(176, 193, 227, 0.14)",
    boxShadow: "0 16px 42px rgba(5, 12, 26, 0.26)",
  },
  statIconWrap: {
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    background: "rgba(30, 86, 145, 0.44)",
    color: "#83d8ff",
    marginBottom: "18px",
  },
  statIcon: {
    fontSize: "20px",
    lineHeight: 1,
  },
  cardLabel: {
    margin: 0,
    color: "#86abda",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 700,
  },
  amount: {
    margin: "14px 0 8px",
    fontSize: "32px",
    color: "#ffffff",
    lineHeight: 1.12,
  },
  helperText: {
    margin: 0,
    color: "#a8bddf",
    lineHeight: 1.65,
    fontSize: "15px",
  },
  actionPanel: {
    background: "rgba(17, 25, 48, 0.92)",
    borderRadius: "30px",
    padding: "20px",
    marginBottom: "20px",
    border: "1px solid rgba(176, 193, 227, 0.12)",
    boxShadow: "0 18px 48px rgba(3, 9, 25, 0.24)",
  },
  actionPanelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "12px",
  },
  actionCardWrap: {
    display: "flex",
    flexDirection: "column",
  },
  actionBtn: {
    border: "1px solid rgba(176, 193, 227, 0.12)",
    borderRadius: "18px",
    width: "100%",
    minHeight: "100%",
    padding: "16px",
    color: "#effaff",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    textAlign: "left",
    fontFamily: "inherit",
  },
  actionTitle: {
    fontSize: "21px",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  actionText: {
    color: "#9bc0e8",
    lineHeight: 1.45,
    fontSize: "13px",
  },
  primaryAction: {
    background: "linear-gradient(135deg, rgba(57, 125, 255, 0.96), rgba(31, 190, 234, 0.96))",
  },
  secondaryAction: {
    background: "rgba(28, 37, 68, 0.92)",
  },
  activeAction: {
    borderColor: "rgba(126, 215, 255, 0.42)",
    boxShadow: "0 0 0 1px rgba(126, 215, 255, 0.18)",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: "rgba(3, 9, 25, 0.46)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    zIndex: 25,
  },
  complaintModal: {
    width: "min(760px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
    borderRadius: "30px",
    padding: "26px",
    background: "linear-gradient(180deg, rgba(20, 29, 57, 0.98) 0%, rgba(15, 23, 43, 0.98) 100%)",
    border: "1px solid rgba(176, 193, 227, 0.16)",
    boxShadow: "0 28px 70px rgba(3, 9, 25, 0.42)",
  },
  modalHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "18px",
    marginBottom: "8px",
  },
  modalCloseButton: {
    border: "1px solid rgba(176, 193, 227, 0.16)",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#e7f5ff",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
  modalTextarea: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "16px",
    border: "1px solid rgba(86, 112, 159, 0.8)",
    padding: "14px 16px",
    minHeight: "150px",
    resize: "vertical",
    background: "rgba(9, 17, 35, 0.74)",
    color: "#f7fbff",
    fontSize: "15px",
    fontFamily: "inherit",
    outline: "none",
  },
  modalActionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap",
  },
  modalSecondaryButton: {
    border: "1px solid rgba(176, 193, 227, 0.18)",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#e6f3ff",
    padding: "15px 20px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
  modalPrimaryButton: {
    marginTop: 0,
  },
  panel: {
    background: "rgba(20, 29, 57, 0.92)",
    borderRadius: "28px",
    padding: "24px",
    border: "1px solid rgba(176, 193, 227, 0.14)",
    boxShadow: "0 18px 48px rgba(3, 9, 25, 0.24)",
    marginBottom: "20px",
  },
  sectionBadge: {
    display: "inline-flex",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(27, 78, 136, 0.42)",
    color: "#81d4ff",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: "16px",
    border: "1px solid rgba(126, 215, 255, 0.14)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "28px",
    color: "#ffffff",
  },
  sectionLead: {
    margin: "10px 0 0",
    color: "#9db8de",
    lineHeight: 1.7,
  },
  sectionHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "16px",
  },
  sectionChip: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(18, 31, 61, 0.9)",
    color: "#8fd8ff",
    fontSize: "12px",
    fontWeight: 700,
    border: "1px solid rgba(126, 215, 255, 0.14)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    margin: "18px 0 12px",
  },
  passwordGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    marginTop: "18px",
  },
  paymentInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "14px",
  },
  paymentInfoCard: {
    borderRadius: "20px",
    background: "rgba(12, 19, 38, 0.6)",
    border: "1px solid rgba(176, 193, 227, 0.12)",
    padding: "16px",
  },
  paymentInfoValue: {
    color: "#f8fbff",
    fontSize: "18px",
    lineHeight: 1.5,
  },
  receiptLink: {
    display: "inline-flex",
    marginTop: "16px",
    color: "#8fd8ff",
    fontWeight: 700,
    textDecoration: "none",
  },
  paymentFailureText: {
    margin: "14px 0 0",
    color: "#ffd89a",
    lineHeight: 1.7,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "16px",
    border: "1px solid rgba(86, 112, 159, 0.8)",
    padding: "14px 16px",
    background: "rgba(9, 17, 35, 0.74)",
    color: "#f7fbff",
    fontSize: "15px",
    fontFamily: "inherit",
    outline: "none",
  },
  submitBtn: {
    border: "none",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #397dff, #1fbfea)",
    color: "#f8fcff",
    padding: "15px 20px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
    marginTop: "14px",
  },
  contentReveal: {
    marginTop: "18px",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  listCard: {
    borderRadius: "22px",
    padding: "20px",
    background: "rgba(29, 39, 72, 0.92)",
    border: "1px solid rgba(176, 193, 227, 0.14)",
  },
  itemTitle: {
    margin: "0 0 6px",
    fontSize: "24px",
    color: "#ffffff",
  },
  itemMeta: {
    margin: 0,
    color: "#8eaed6",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  bodyText: {
    margin: "12px 0 0",
    color: "#d8e5f8",
    lineHeight: 1.8,
  },
  itemFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "16px",
  },
  inlineTag: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(31, 72, 128, 0.44)",
    color: "#8fd8ff",
    fontSize: "12px",
    fontWeight: 700,
  },
  inlineMeta: {
    color: "#9db8de",
    fontSize: "13px",
  },
  replyCard: {
    marginTop: "16px",
    padding: "16px",
    borderRadius: "18px",
    background: "rgba(17, 25, 48, 0.9)",
    border: "1px solid rgba(126, 215, 255, 0.14)",
  },
  replyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "10px",
  },
  replyBadge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(31, 72, 128, 0.44)",
    color: "#8fd8ff",
    fontSize: "12px",
    fontWeight: 700,
  },
  replyMeta: {
    color: "#8eaed6",
    fontSize: "12px",
  },
  replyBody: {
    margin: 0,
    color: "#e0ebfa",
    lineHeight: 1.8,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: "12px",
  },
  badgePaid: {
    background: "rgba(24, 109, 75, 0.32)",
    color: "#9bf4c6",
  },
  badgePending: {
    background: "rgba(28, 70, 136, 0.34)",
    color: "#93d9ff",
  },
  badgeWarning: {
    background: "rgba(129, 85, 22, 0.28)",
    color: "#ffd89a",
  },
  emptyText: {
    margin: 0,
    color: "#a5bddf",
    lineHeight: 1.8,
  },
  logoutBtn: {
    marginTop: "18px",
    border: "1px solid rgba(255, 151, 171, 0.2)",
    borderRadius: "16px",
    background: "rgba(131, 36, 61, 0.4)",
    color: "#ffd9e1",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
  chatLauncher: {
    position: "fixed",
    right: "28px",
    bottom: "28px",
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    border: "1px solid rgba(176, 193, 227, 0.18)",
    background: "linear-gradient(135deg, rgba(57, 125, 255, 0.96), rgba(31, 190, 234, 0.96))",
    color: "#f4f7ff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 18px 40px rgba(3, 9, 25, 0.34)",
    zIndex: 20,
    fontFamily: "inherit",
  },
  chatPanel: {
    position: "fixed",
    right: "28px",
    bottom: "90px",
    width: "360px",
    maxHeight: "520px",
    display: "flex",
    flexDirection: "column",
    background: "rgba(20, 29, 57, 0.97)",
    color: "#f4f7ff",
    borderRadius: "24px",
    border: "1px solid rgba(176, 193, 227, 0.18)",
    boxShadow: "0 24px 56px rgba(3, 9, 25, 0.34)",
    overflow: "hidden",
    zIndex: 20,
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    padding: "18px 18px 14px",
    borderBottom: "1px solid rgba(176, 193, 227, 0.12)",
  },
  chatTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#ffffff",
  },
  chatSubtitle: {
    marginTop: "6px",
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#9db8de",
  },
  chatCloseButton: {
    border: "none",
    background: "transparent",
    color: "#9db8de",
    cursor: "pointer",
    fontSize: "22px",
    lineHeight: 1,
    fontFamily: "inherit",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  chatMessageRow: {
    display: "flex",
  },
  chatMessageRowUser: {
    justifyContent: "flex-end",
  },
  chatMessageRowModel: {
    justifyContent: "flex-start",
  },
  chatBubble: {
    maxWidth: "82%",
    padding: "12px 14px",
    borderRadius: "18px",
    fontSize: "14px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  chatBubbleUser: {
    background: "linear-gradient(135deg, rgba(57, 125, 255, 0.96), rgba(31, 190, 234, 0.96))",
    color: "#f8fcff",
    borderBottomRightRadius: "6px",
  },
  chatBubbleModel: {
    background: "rgba(29, 39, 72, 0.92)",
    color: "#e4eefc",
    border: "1px solid rgba(176, 193, 227, 0.14)",
    borderBottomLeftRadius: "6px",
  },
  chatComposer: {
    display: "flex",
    gap: "10px",
    padding: "16px",
    borderTop: "1px solid rgba(176, 193, 227, 0.12)",
  },
  chatInput: {
    flex: 1,
    borderRadius: "16px",
    border: "1px solid rgba(86, 112, 159, 0.8)",
    padding: "12px 14px",
    background: "rgba(9, 17, 35, 0.74)",
    color: "#f7fbff",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
  },
  chatSendButton: {
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #397dff, #1fbfea)",
    color: "#f8fcff",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
};

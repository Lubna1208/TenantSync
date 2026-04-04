import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000/api";

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
  payment_month: string;
  status: "paid" | "unpaid" | "pending";
  payment_date?: string | null;
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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
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
  return value.split("_").join(" ").replace(/\\b\\w/g, (letter: string) => letter.toUpperCase());
}

export default function DashboardTenant() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    title: "",
    category: "",
    priority: "medium",
    description: "",
  });
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [isPayingRent, setIsPayingRent] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    void loadDashboard();
  }, [user, navigate]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/tenant/dashboard`, {
        credentials: "include",
        cache: "no-store",
      });

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
        setError(data?.message ?? "Tenant dashboard could not be loaded.");
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
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore logout failure
    }

    localStorage.removeItem("ts_user");
    localStorage.removeItem("ts_token");
    sessionStorage.removeItem("ts_user");
    setUser(null);
    navigate("/login", { replace: true });
  }

  async function payRent() {
    setIsPayingRent(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/tenant/rent-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Rent payment could not be submitted.");
        return;
      }

      setMessage(data?.message ?? "Rent payment submitted successfully.");
      await loadDashboard();
    } catch {
      setError("Network error while submitting rent payment.");
    } finally {
      setIsPayingRent(false);
    }
  }

  async function submitComplaint(e: FormEvent) {
    e.preventDefault();
    setIsSubmittingComplaint(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/tenant/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(complaintForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Complaint could not be submitted.");
        return;
      }

      setComplaintForm({
        title: "",
        category: "",
        priority: "medium",
        description: "",
      });
      setShowComplaintForm(false);
      setMessage(data?.message ?? "Complaint submitted successfully.");
      await loadDashboard();
    } catch {
      setError("Network error while submitting complaint.");
    } finally {
      setIsSubmittingComplaint(false);
    }
  }

  if (!user) return null;

  const latestPayment = dashboard?.latest_payment ?? null;
  const latestComplaint = dashboard?.complaints?.[0] ?? null;
  const unit = dashboard?.unit ?? null;
  const property = dashboard?.property ?? null;
  const tenant = dashboard?.tenant ?? null;

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <section style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>Tenant Portal</div>
            <h1 style={styles.heroTitle}>
              {property?.name ?? "Your apartment profile"}
            </h1>
            <p style={styles.heroText}>
              {unit
                ? `Building ${property?.name ?? "assigned property"}, unit ${unit.unit_number}${unit.floor ? ` on floor ${unit.floor}` : ""}.`
                : "Your manager has not assigned a unit yet."}
            </p>
          </div>

          <div style={styles.profileCard}>
            <div style={styles.avatar}>{user.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <div style={styles.profileName}>{user.name}</div>
              <div style={styles.profileMeta}>{user.email}</div>
              <div style={styles.profileMeta}>
                {tenant?.move_in_date
                  ? `Moved in ${formatDate(tenant.move_in_date)}`
                  : "Move-in date not added yet"}
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
            <h2 style={styles.sectionTitle}>Assignment Pending</h2>
            <p style={styles.emptyText}>
              Your tenant account exists, but no building or unit has been assigned
              yet.
            </p>
            <button onClick={logout} style={styles.logoutBtn}>
              Logout
            </button>
          </section>
        ) : (
          <>
            <section style={styles.summaryGrid}>
              <div style={styles.featureCard}>
                <p style={styles.cardLabel}>Rent Status</p>
                <p style={styles.cardMeta}>
                  {formatMonth(latestPayment?.payment_month)}
                </p>
                <h2 style={styles.amount}>
                  Tk {Number(latestPayment?.amount ?? unit?.rent_amount ?? 0).toLocaleString()}
                </h2>
                <span
                  style={{
                    ...styles.badge,
                    ...(latestPayment?.status === "paid"
                      ? styles.badgePaid
                      : styles.badgePending),
                  }}
                >
                  {latestPayment?.status === "paid"
                    ? `Paid on ${formatDate(latestPayment.payment_date)}`
                    : latestPayment
                      ? formatStatus(latestPayment.status)
                      : "No payment submitted yet"}
                </span>
                <p style={styles.helperText}>
                  Next due: {formatDate(dashboard.next_due_date)}
                </p>
              </div>

              <div style={styles.featureCard}>
                <p style={styles.cardLabel}>Latest Complaint</p>
                <p style={styles.complaintHeadline}>
                  {latestComplaint?.title ?? "No complaint submitted yet"}
                </p>
                <span
                  style={{
                    ...styles.badge,
                    ...(latestComplaint?.status === "resolved"
                      ? styles.badgePaid
                      : styles.badgeWarning),
                  }}
                >
                  {latestComplaint
                    ? formatStatus(latestComplaint.status)
                    : "Everything looks quiet"}
                </span>
                <p style={styles.helperText}>
                  {latestComplaint
                    ? `Submitted ${formatRelative(latestComplaint.created_at)}`
                    : "Use the complaint form any time you need help."}
                </p>
              </div>

              <div style={styles.featureCard}>
                <p style={styles.cardLabel}>Lease Details</p>
                <p style={styles.propertyLine}>
                  {property?.address ?? "Property address not available"}
                </p>
                <p style={styles.helperText}>
                  Lease start: {formatDate(tenant?.lease_start)}
                </p>
                <p style={styles.helperText}>
                  Lease end: {formatDate(tenant?.lease_end)}
                </p>
              </div>
            </section>

            <section style={styles.actionPanel}>
              <button
                style={{ ...styles.actionBtn, ...styles.primaryAction }}
                onClick={() => void payRent()}
                disabled={isPayingRent || !unit}
              >
                {isPayingRent ? "Processing..." : "Pay Rent"}
              </button>
              <button
                style={{ ...styles.actionBtn, ...styles.secondaryAction }}
                onClick={() => setShowComplaintForm((current) => !current)}
                disabled={!unit}
              >
                {showComplaintForm ? "Hide Complaint Form" : "Submit Complaint"}
              </button>
              <button style={{ ...styles.actionBtn, ...styles.logoutAction }} onClick={logout}>
                Logout
              </button>
            </section>

            {showComplaintForm && (
              <form style={styles.panel} onSubmit={submitComplaint}>
                <h2 style={styles.sectionTitle}>Submit a Complaint</h2>
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
                  style={{ ...styles.input, minHeight: "120px", resize: "vertical" }}
                  placeholder="Describe the issue"
                  value={complaintForm.description}
                  onChange={(e) =>
                    setComplaintForm((current) => ({
                      ...current,
                      description: e.target.value,
                    }))
                  }
                />
                <button style={styles.submitBtn} type="submit" disabled={isSubmittingComplaint}>
                  {isSubmittingComplaint ? "Submitting..." : "Send Complaint"}
                </button>
              </form>
            )}

            <section style={styles.contentGrid}>
              <div style={styles.panel}>
                <div style={styles.sectionHeadRow}>
                  <h2 style={styles.sectionTitle}>Complaint History</h2>
                  <span style={styles.sectionChip}>
                    {dashboard.complaints.length} total
                  </span>
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
                            <p style={styles.itemMeta}>
                              {complaint.category || "General issue"} • {" "}
                              {formatRelative(complaint.created_at)}
                            </p>
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
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.panel}>
                <div style={styles.sectionHeadRow}>
                  <h2 style={styles.sectionTitle}>Announcements</h2>
                  <span style={styles.sectionChip}>
                    {dashboard.announcements.length} updates
                  </span>
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
                          {item.creator?.name ?? "Management"} • {formatDate(item.created_at)}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#e0ecf7",
    padding: "28px",
    color: "#1f2937",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  shell: {
    maxWidth: "1240px",
    margin: "0 auto",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
    gap: "20px",
    alignItems: "stretch",
    marginBottom: "20px",
  },
  eyebrow: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#123b58",
    color: "#f8fafc",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontSize: "12px",
    marginBottom: "14px",
  },
  heroTitle: {
    margin: "0 0 10px",
    fontSize: "44px",
    lineHeight: 1.04,
  },
  heroText: {
    margin: 0,
    maxWidth: "720px",
    color: "#52606d",
    fontSize: "18px",
    lineHeight: 1.65,
  },
  profileCard: {
    background: "rgba(255,255,255,0.86)",
    borderRadius: "28px",
    padding: "22px",
    border: "1px solid rgba(18,59,88,0.08)",
    boxShadow: "0 18px 48px rgba(18, 59, 88, 0.12)",
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  avatar: {
    width: "68px",
    height: "68px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #123b58, #3b82f6)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: "28px",
    fontWeight: 700,
  },
  profileName: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "6px",
  },
  profileMeta: {
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  notice: {
    borderRadius: "18px",
    padding: "14px 16px",
    marginBottom: "18px",
    fontWeight: 600,
  },
  noticeSuccess: {
    background: "#e8f7ef",
    color: "#0f6d43",
  },
  noticeError: {
    background: "#fdecec",
    color: "#b42318",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "18px",
  },
  featureCard: {
    background: "rgba(255,255,255,0.84)",
    borderRadius: "26px",
    padding: "22px",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
  },
  cardLabel: {
    margin: 0,
    color: "#475467",
    fontSize: "14px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  cardMeta: {
    margin: "8px 0 12px",
    color: "#667085",
    fontSize: "14px",
  },
  amount: {
    margin: "0 0 14px",
    fontSize: "34px",
  },
  helperText: {
    margin: "14px 0 0",
    color: "#667085",
    lineHeight: 1.6,
  },
  complaintHeadline: {
    margin: "14px 0",
    fontSize: "22px",
    lineHeight: 1.35,
  },
  propertyLine: {
    margin: "16px 0 0",
    fontSize: "18px",
    color: "#101828",
    lineHeight: 1.5,
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
    background: "#dff7e8",
    color: "#0f6d43",
  },
  badgePending: {
    background: "#e8eef6",
    color: "#123b58",
  },
  badgeWarning: {
    background: "#fff1d6",
    color: "#9a6700",
  },
  actionPanel: {
    background: "rgba(255,255,255,0.84)",
    borderRadius: "24px",
    padding: "18px",
    marginBottom: "18px",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  actionBtn: {
    border: "none",
    borderRadius: "18px",
    padding: "16px 18px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryAction: {
    background: "#123b58",
  },
  secondaryAction: {
    background: "#d97706",
  },
  logoutAction: {
    background: "#b42318",
  },
  panel: {
    background: "rgba(255,255,255,0.84)",
    borderRadius: "26px",
    padding: "22px",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
    marginBottom: "18px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "28px",
  },
  sectionHeadRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "14px",
  },
  sectionChip: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#f2f4f7",
    color: "#475467",
    fontSize: "12px",
    fontWeight: 700,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    margin: "18px 0 12px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "16px",
    border: "1px solid #d0d5dd",
    padding: "13px 14px",
    background: "#fffefb",
    fontSize: "15px",
    fontFamily: "inherit",
  },
  submitBtn: {
    border: "none",
    borderRadius: "16px",
    background: "#123b58",
    color: "#fff",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 700,
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
    gap: "18px",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  listCard: {
    borderRadius: "20px",
    padding: "18px",
    background: "#fffdfa",
    border: "1px solid #e4e7eb",
  },
  itemTitle: {
    margin: "0 0 6px",
    fontSize: "20px",
  },
  itemMeta: {
    margin: 0,
    color: "#667085",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  bodyText: {
    margin: "12px 0 0",
    color: "#344054",
    lineHeight: 1.7,
  },
  emptyText: {
    margin: 0,
    color: "#667085",
    lineHeight: 1.6,
  },
  logoutBtn: {
    marginTop: "18px",
    border: "none",
    borderRadius: "14px",
    background: "#b42318",
    color: "#fff",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
};





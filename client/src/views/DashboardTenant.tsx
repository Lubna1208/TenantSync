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
  const [showPasswordForm, setShowPasswordForm] = useState(false);
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

  async function submitPasswordChange(e: FormEvent) {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("ts_token");
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(passwordForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Password could not be updated.");
        return;
      }

      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      setShowPasswordForm(false);
      setMessage(data?.message ?? "Password updated successfully.");
    } catch {
      setError("Network error while updating password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  if (!user) return null;

  const latestPayment = dashboard?.latest_payment ?? null;
  const latestComplaint = dashboard?.complaints?.[0] ?? null;
  const unit = dashboard?.unit ?? null;
  const property = dashboard?.property ?? null;
  const tenant = dashboard?.tenant ?? null;

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
              </form>
            )}

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

            <section style={styles.actionPanel}>
              <div style={styles.sectionBadge}>Tenant Actions</div>
              <div style={styles.actionPanelGrid}>
                <button
                  style={{ ...styles.actionBtn, ...styles.primaryAction }}
                  onClick={() => void payRent()}
                  disabled={isPayingRent || !unit}
                >
                  <span style={styles.actionTitle}>{isPayingRent ? "Processing..." : "Pay Rent"}</span>
                  <span style={styles.actionText}>Submit your current rent update from here.</span>
                </button>
                <button
                  style={{ ...styles.actionBtn, ...styles.secondaryAction }}
                  onClick={() => setShowComplaintForm((current) => !current)}
                  disabled={!unit}
                >
                  <span style={styles.actionTitle}>
                    {showComplaintForm ? "Hide Complaint Form" : "Submit Complaint"}
                  </span>
                  <span style={styles.actionText}>Send a maintenance or support request instantly.</span>
                </button>
              </div>
            </section>

            {showComplaintForm && (
              <form style={styles.panel} onSubmit={submitComplaint}>
                <div style={styles.sectionBadge}>Support Request</div>
                <h2 style={styles.sectionTitle}>Submit a Complaint</h2>
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
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.panel}>
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
          </>
        )}
      </div>
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
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    marginTop: "12px",
  },
  actionBtn: {
    border: "1px solid rgba(176, 193, 227, 0.12)",
    borderRadius: "24px",
    padding: "22px",
    color: "#effaff",
    fontSize: "15px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "10px",
    textAlign: "left",
    fontFamily: "inherit",
  },
  actionTitle: {
    fontSize: "30px",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  actionText: {
    color: "#9bc0e8",
    lineHeight: 1.6,
    fontSize: "15px",
  },
  primaryAction: {
    background: "linear-gradient(135deg, rgba(57, 125, 255, 0.96), rgba(31, 190, 234, 0.96))",
  },
  secondaryAction: {
    background: "rgba(28, 37, 68, 0.92)",
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
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
    gap: "18px",
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
};

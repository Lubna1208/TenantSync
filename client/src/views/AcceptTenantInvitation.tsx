import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../helpers/authApi";

type InvitationData = {
  tenant_name?: string | null;
  email?: string | null;
  unit_number?: string | null;
  property_name?: string | null;
  property_address?: string | null;
  lease_start?: string | null;
  lease_end?: string | null;
  move_in_date?: string | null;
  expires_at?: string | null;
  invited_by?: string | null;
};

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

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

export default function AcceptTenantInvitation() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invalid or expired link");
      return;
    }

    void loadInvitation(token);
  }, [token]);

  async function loadInvitation(invitationToken: string) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(apiUrl(`/tenant-invitations/${invitationToken}`), {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setInvitation(null);
        setError(data?.message ?? "Invalid or expired link");
        return;
      }

      setInvitation(data?.data ?? null);
    } catch {
      setError("Network error while loading the invitation.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptInvitation(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setError("Invalid or expired link");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(apiUrl(`/tenant-invitations/${token}/accept`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message ?? "Invitation could not be accepted.");
        return;
      }

      const user = data?.user as User | undefined;

      if (user?.id) {
        localStorage.setItem("ts_user", JSON.stringify(user));
      }

      if (typeof data?.token === "string" && data.token) {
        localStorage.setItem("ts_token", data.token);
      }

      sessionStorage.removeItem("ts_user");
      setMessage(data?.message ?? "Invitation accepted successfully.");

      window.setTimeout(() => {
        navigate("/dashboard-tenant", { replace: true });
      }, 700);
    } catch {
      setError("Network error while accepting the invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.panel}>
        <div style={styles.badge}>Tenant Invitation</div>
        <h1 style={styles.title}>Accept your TenantSync access</h1>
        <p style={styles.lead}>
          Set your password once, then continue into your tenant dashboard with your personal email.
        </p>

        {loading ? <p style={styles.text}>Loading invitation...</p> : null}
        {!loading && error ? <div style={{ ...styles.notice, ...styles.noticeError }}>{error}</div> : null}
        {!loading && message ? <div style={{ ...styles.notice, ...styles.noticeSuccess }}>{message}</div> : null}

        {!loading && invitation ? (
          <>
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <span style={styles.infoLabel}>Tenant</span>
                <strong style={styles.infoValue}>{invitation.tenant_name ?? "Pending"}</strong>
              </div>
              <div style={styles.infoCard}>
                <span style={styles.infoLabel}>Email</span>
                <strong style={styles.infoValue}>{invitation.email ?? "Pending"}</strong>
              </div>
              <div style={styles.infoCard}>
                <span style={styles.infoLabel}>Unit</span>
                <strong style={styles.infoValue}>{invitation.unit_number ?? "Pending"}</strong>
              </div>
              <div style={styles.infoCard}>
                <span style={styles.infoLabel}>Property</span>
                <strong style={styles.infoValue}>{invitation.property_name ?? "Pending"}</strong>
              </div>
            </div>

            <div style={styles.metaBox}>
              <p style={styles.metaText}>Address: {invitation.property_address ?? "Not set"}</p>
              <p style={styles.metaText}>Lease Start: {formatDate(invitation.lease_start)}</p>
              <p style={styles.metaText}>Lease End: {formatDate(invitation.lease_end)}</p>
              <p style={styles.metaText}>Move In: {formatDate(invitation.move_in_date)}</p>
              <p style={styles.metaText}>Invited By: {invitation.invited_by ?? "Management"}</p>
              <p style={styles.metaText}>Expires: {formatDate(invitation.expires_at)}</p>
            </div>

            <form style={styles.form} onSubmit={acceptInvitation}>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Set Password</span>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      password: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={styles.field}>
                <span style={styles.fieldLabel}>Confirm Password</span>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Confirm your password"
                  value={form.password_confirmation}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      password_confirmation: e.target.value,
                    }))
                  }
                />
              </label>

              <button style={styles.button} type="submit" disabled={submitting}>
                {submitting ? "Activating..." : "Accept Invitation"}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #0e1834 0%, #15244d 100%)",
    padding: "24px",
    color: "#f4f7ff",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  panel: {
    width: "100%",
    maxWidth: "760px",
    borderRadius: "28px",
    padding: "28px",
    background: "rgba(18, 27, 54, 0.94)",
    border: "1px solid rgba(176, 193, 227, 0.16)",
    boxShadow: "0 24px 56px rgba(3, 9, 25, 0.34)",
  },
  badge: {
    display: "inline-flex",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(31, 91, 156, 0.46)",
    color: "#7ed7ff",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontSize: "12px",
    fontWeight: 700,
  },
  title: {
    margin: "18px 0 10px",
    fontSize: "40px",
    lineHeight: 1.1,
  },
  lead: {
    margin: 0,
    color: "#a9bee0",
    lineHeight: 1.8,
    fontSize: "16px",
  },
  notice: {
    marginTop: "20px",
    borderRadius: "18px",
    padding: "14px 16px",
    fontWeight: 700,
  },
  noticeError: {
    background: "rgba(122, 24, 44, 0.3)",
    color: "#ffc3ce",
    border: "1px solid rgba(255, 135, 158, 0.22)",
  },
  noticeSuccess: {
    background: "rgba(12, 82, 57, 0.34)",
    color: "#a6f4cd",
    border: "1px solid rgba(84, 196, 141, 0.28)",
  },
  text: {
    marginTop: "20px",
    color: "#a9bee0",
    lineHeight: 1.8,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
    marginTop: "24px",
  },
  infoCard: {
    borderRadius: "18px",
    padding: "16px",
    background: "rgba(29, 39, 72, 0.92)",
    border: "1px solid rgba(176, 193, 227, 0.14)",
  },
  infoLabel: {
    display: "block",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#83d8ff",
    marginBottom: "8px",
    fontWeight: 700,
  },
  infoValue: {
    fontSize: "18px",
    lineHeight: 1.5,
  },
  metaBox: {
    marginTop: "18px",
    borderRadius: "20px",
    padding: "18px",
    background: "rgba(11, 19, 38, 0.72)",
    border: "1px solid rgba(176, 193, 227, 0.12)",
  },
  metaText: {
    margin: "0 0 10px",
    color: "#cfe0f7",
    lineHeight: 1.7,
  },
  form: {
    marginTop: "22px",
    display: "grid",
    gap: "14px",
  },
  field: {
    display: "grid",
    gap: "8px",
  },
  fieldLabel: {
    color: "#a9bee0",
    fontSize: "14px",
    fontWeight: 700,
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
  button: {
    border: "none",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #397dff, #1fbfea)",
    color: "#f8fcff",
    padding: "15px 20px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
};

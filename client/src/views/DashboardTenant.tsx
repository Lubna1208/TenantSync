import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type User = {
  id: number;
  name: string;
  email: string;
  date_of_birth?: string | null;
  role?: string;
  status?: string;
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

export default function DashboardTenant() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  async function logout() {
    try {
      await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }

    localStorage.removeItem("ts_user");
    setUser(null);
    navigate("/login");
  }

  if (!user) return null;

  const announcements = [
    {
      title: "Pool Maintenance",
      text: "Pool will be closed for cleaning this Saturday, Jan 25",
      date: "Jan 20, 2026",
    },
    {
      title: "Community Event",
      text: "Join us for a BBQ Party next Sunday at the courtyard",
      date: "Jan 18, 2026",
    },
    {
      title: "Parking Reminder",
      text: "Please park only in designated spots.",
      date: "Jan 18, 2026",
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>My Apartment</h1>
            <p style={styles.subtitle}>Unit 304, Building A</p>
          </div>

          <div style={styles.profileBox}>
            <div style={styles.avatar}>👨🏻‍💼</div>
            <div style={styles.profileText}>
              <div style={styles.profileName}>{user.name}</div>
              <div style={styles.profileMeta}>ID 184******</div>
            </div>
          </div>
        </header>

        <main style={styles.main}>
          <section style={styles.topCards}>
            <div style={styles.card}>
              <p style={styles.cardLabel}>Rent Status</p>
              <p style={styles.cardDate}>January 2026</p>
              <h2 style={styles.amount}>20,000 Tk</h2>

              <div style={styles.paidBadge}>Paid on Jan 3, 2026</div>
              <p style={styles.nextDue}>Next due: Feb 1, 2026</p>
            </div>

            <div style={styles.card}>
              <p style={styles.cardLabel}>Recent Complaint</p>
              <p style={styles.complaintTitle}>Leaky faucet in kitchen</p>

              <div style={styles.progressBadge}>In Progress</div>
              <p style={styles.submitInfo}>◔ Submitted 2 day ago</p>
            </div>
          </section>

          <section style={styles.actionCard}>
            <button style={{ ...styles.actionBtn, ...styles.blueBtn }}>
              Pay Rent
            </button>
            <button style={{ ...styles.actionBtn, ...styles.purpleBtn }}>
              Submit Complaint
            </button>
            <button style={{ ...styles.actionBtn, ...styles.greenBtn }}>
              Chat With AI
            </button>
          </section>

          <section style={styles.announcementCard}>
            <div style={styles.announcementHeader}>
              <span style={styles.announcementIcon}>📢</span>
              <h3 style={styles.announcementTitle}>Announcements</h3>
            </div>

            <div>
              {announcements.map((item, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.announcementItem,
                    borderBottom:
                      index !== announcements.length - 1
                        ? "1px solid #e5e7eb"
                        : "none",
                  }}
                >
                  <p style={styles.itemTitle}>{item.title}</p>
                  <p style={styles.itemText}>{item.text}</p>
                  <p style={styles.itemDate}>🗓 {item.date}</p>
                </div>
              ))}
            </div>
          </section>

          <div style={styles.footerRow}>
            <button onClick={logout} style={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "#eaf3f8",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },
  wrapper: {
    maxWidth: "1180px",
    margin: "0 auto",
    background: "#f8fbfd",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  header: {
    background: "#ffffff",
    padding: "20px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #edf2f7",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
    color: "#1f2937",
    letterSpacing: "0.5px",
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#6b7280",
  },
  profileBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  },
  profileText: {
    textAlign: "center",
  },
  profileName: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
  },
  profileMeta: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px",
  },
  main: {
    padding: "28px",
  },
  topCards: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginBottom: "18px",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "22px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    minHeight: "170px",
  },
  cardLabel: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    color: "#374151",
  },
  cardDate: {
    margin: "6px 0 10px",
    fontSize: "13px",
    color: "#6b7280",
  },
  amount: {
    margin: "0 0 14px",
    fontSize: "34px",
    fontWeight: 700,
    color: "#111827",
  },
  paidBadge: {
    display: "inline-block",
    background: "#c8f2d5",
    color: "#23734f",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 600,
  },
  nextDue: {
    marginTop: "18px",
    fontSize: "13px",
    color: "#9ca3af",
    textAlign: "right",
  },
  complaintTitle: {
    margin: "10px 0 14px",
    fontSize: "20px",
    fontWeight: 600,
    color: "#1f2937",
  },
  progressBadge: {
    display: "inline-block",
    background: "#f5e3cf",
    color: "#a16207",
    padding: "7px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 600,
  },
  submitInfo: {
    marginTop: "18px",
    fontSize: "13px",
    color: "#6b7280",
  },
  actionCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "18px",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  actionBtn: {
    border: "none",
    borderRadius: "12px",
    padding: "16px 18px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    letterSpacing: "0.3px",
  },
  blueBtn: {
    background: "#3498f3",
  },
  purpleBtn: {
    background: "#8b7cf6",
  },
  greenBtn: {
    background: "#12d92e",
  },
  announcementCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "22px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  announcementHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  announcementIcon: {
    fontSize: "18px",
  },
  announcementTitle: {
    margin: 0,
    fontSize: "17px",
    color: "#2563eb",
    textDecoration: "underline",
    fontWeight: 600,
  },
  announcementItem: {
    padding: "14px 0",
  },
  itemTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#374151",
  },
  itemText: {
    margin: "6px 0",
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: 1.6,
  },
  itemDate: {
    margin: 0,
    fontSize: "12px",
    color: "#6b7280",
  },
  footerRow: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "flex-end",
  },
  logoutBtn: {
    border: "none",
    background: "#ef4444",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
};
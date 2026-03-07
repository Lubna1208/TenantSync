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

export default function DashboardManager() {
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

  const units = [
    { unit: "A-101", tenant: "Jawad Al Nasrum Shams", status: "Occupied", rent: "20,000" },
    { unit: "A-102", tenant: "Sajib Hasan", status: "Occupied", rent: "20,000" },
    { unit: "B-201", tenant: "-", status: "Vacant", rent: "22,111" },
    { unit: "B-202", tenant: "Faria Islam Usha", status: "Occupied", rent: "22,000" },
    { unit: "C-301", tenant: "-", status: "Vacant", rent: "24,000" },
    { unit: "C-302", tenant: "Safwat Ashraf Nabil", status: "Occupied", rent: "24,888" },
  ];

  const pendingComplaints = [
    {
      title: "Leaking faucet in bathroom",
      subtitle: "Unit A-201 · Sofia Hasan",
      time: "2 hours ago",
    },
    {
      title: "AC not cooling properly",
      subtitle: "Unit B-105 · Jawad Al Nasrum Shams",
      time: "5 hours ago",
    },
  ];

  const maintenance = [
    {
      title: "Maintenance",
      subtitle: "Unit C-301 · Faria Islam Lubna",
      time: "30 min ago",
    },
    {
      title: "Additional Key Request",
      subtitle: "Unit D-401 · Safwat Ashraf Nabil",
      time: "15 min ago",
    },
  ];

  function statusBadge(status: string) {
    const base: React.CSSProperties = {
      padding: "5px 12px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
      display: "inline-block",
      minWidth: "84px",
      textAlign: "center",
    };

    if (status === "Occupied") {
      return {
        ...base,
        background: "#c7f4d0",
        color: "#1b7a3f",
      };
    }

    return {
      ...base,
      background: "#ffd9b3",
      color: "#b45309",
    };
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <div />

          <div style={styles.profileBox}>
            <div style={styles.profileIcon}>🧑🏻‍💼</div>
            <div style={styles.profileText}>
              <div style={styles.profileName}>{user.name || "Manager"}</div>
              <div style={styles.profileMeta}>{user.email}</div>
            </div>
          </div>
        </header>

        <main style={styles.main}>
          <section style={styles.mainPanel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Assigned Apartments</h2>
            </div>

            <section style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🏢</div>
                <div style={styles.statValue}>48</div>
                <div style={styles.statLabel}>Total Units</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>🏠</div>
                <div style={styles.statValue}>42</div>
                <div style={styles.statLabel}>Occupied</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>❗</div>
                <div style={styles.statValue}>6</div>
                <div style={styles.statLabel}>Vacant</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>✅</div>
                <div style={styles.statValue}>4</div>
                <div style={styles.statLabel}>Available</div>
              </div>
            </section>

            <section style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Unit</th>
                    <th style={styles.th}>Tenant</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.thRight}>Monthly Rent</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((item, index) => (
                    <tr key={index}>
                      <td style={styles.td}>{item.unit}</td>
                      <td style={styles.td}>{item.tenant}</td>
                      <td style={styles.td}>
                        <span style={statusBadge(item.status)}>{item.status}</span>
                      </td>
                      <td style={styles.tdRight}>{item.rent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </section>

          <section style={styles.lowerGrid}>
            <div style={styles.infoCard}>
              <h3 style={styles.infoTitleBlue}>Pending Complaints</h3>

              {pendingComplaints.map((item, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.infoItem,
                    borderBottom:
                      index !== pendingComplaints.length - 1
                        ? "1px solid #e5e7eb"
                        : "none",
                  }}
                >
                  <div style={styles.infoItemTitle}>{item.title}</div>
                  <div style={styles.infoItemSubtitle}>{item.subtitle}</div>
                  <div style={styles.infoItemTime}>{item.time}</div>
                </div>
              ))}
            </div>

            <div style={styles.infoCard}>
              {maintenance.map((item, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.infoItem,
                    borderBottom:
                      index !== maintenance.length - 1
                        ? "1px solid #e5e7eb"
                        : "none",
                  }}
                >
                  <div style={styles.infoItemTitle}>{item.title}</div>
                  <div style={styles.infoItemSubtitle}>{item.subtitle}</div>
                  <div style={styles.infoItemTime}>{item.time}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.quickCard}>
            <h3 style={styles.quickTitle}>Quick Actions</h3>

            <div style={styles.buttonGrid}>
              <button style={{ ...styles.actionBtn, background: "#5aa6ff" }}>
                Add Property
              </button>
              <button style={{ ...styles.actionBtn, background: "#30e645" }}>
                New Tenant
              </button>
              <button style={{ ...styles.actionBtn, background: "#a78bfa" }}>
                Create Lease
              </button>
              <button style={{ ...styles.actionBtn, background: "#f87171" }}>
                Inspection
              </button>
              <button style={{ ...styles.actionBtn, background: "#fb923c" }}>
                Send Notice
              </button>
              <button style={{ ...styles.actionBtn, background: "#d97706" }}>
                Maintenance
              </button>
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
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  wrapper: {
    maxWidth: "1240px",
    margin: "0 auto",
    background: "#f8fbfd",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  header: {
    background: "#ffffff",
    padding: "18px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #edf2f7",
    minHeight: "72px",
  },
  profileBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  profileIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
  },
  profileText: {
    textAlign: "left",
  },
  profileName: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
  },
  profileMeta: {
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "2px",
  },
  main: {
    padding: "28px 34px 24px",
  },
  mainPanel: {
    background: "#dff3ff",
    borderRadius: "8px",
    padding: "18px 16px 16px",
    marginBottom: "18px",
  },
  panelHeader: {
    marginBottom: "12px",
  },
  panelTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#374151",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px",
    marginBottom: "14px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "8px",
    padding: "14px 10px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  statIcon: {
    fontSize: "18px",
    marginBottom: "6px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "11px",
    color: "#6b7280",
    fontWeight: 600,
  },
  tableWrap: {
    background: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 700,
    color: "#374151",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#fff",
  },
  thRight: {
    textAlign: "right",
    fontSize: "12px",
    fontWeight: 700,
    color: "#374151",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#fff",
  },
  td: {
    padding: "10px 12px",
    fontSize: "12px",
    color: "#374151",
    borderBottom: "1px solid #eef2f7",
  },
  tdRight: {
    padding: "10px 12px",
    fontSize: "12px",
    color: "#374151",
    borderBottom: "1px solid #eef2f7",
    textAlign: "right",
    fontWeight: 600,
  },
  lowerGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
    marginBottom: "18px",
  },
  infoCard: {
    background: "#fff",
    borderRadius: "8px",
    padding: "14px 16px",
    minHeight: "160px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  infoTitleBlue: {
    margin: "0 0 10px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#2563eb",
  },
  infoItem: {
    padding: "10px 0",
  },
  infoItemTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "4px",
  },
  infoItemSubtitle: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "4px",
  },
  infoItemTime: {
    fontSize: "11px",
    color: "#9ca3af",
  },
  quickCard: {
    background: "#fff",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  quickTitle: {
    margin: "0 0 14px",
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827",
  },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px 24px",
    maxWidth: "760px",
  },
  actionBtn: {
    border: "none",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "12px",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
  },
  footerRow: {
    marginTop: "16px",
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
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

export default function Dashboard() {
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

  const stats = [
    { title: "Total Apartments", value: "124", change: "+12%" },
    { title: "Total Tenants", value: "108", change: "+8%" },
    { title: "Monthly Revenue", value: "580,000 Tk", change: "+5.1%" },
    { title: "Pending Complaints", value: "12", change: "-3 from last week" },
  ];

  const recentActivities = [
    { tenant: "Sofia Hasan", apartment: "A-101", action: "Rent Unpaid", amount: "60,000", status: "Pending" },
    { tenant: "Safwan Arif Naul", apartment: "B-203", action: "Complaint Filed", amount: "-", status: "In Progress" },
    { tenant: "Faria Islam Usha", apartment: "C-306", action: "Maintenance Request", amount: "-", status: "Pending" },
    { tenant: "Jawad Al Nasrum Shams", apartment: "D-409", action: "Rent Paid", amount: "20,000", status: "Completed" },
  ];

  const chartData = [60000, 62000, 65000, 59000, 66000, 57000];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const maxValue = Math.max(...chartData);

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>Dashboard Overview</h2>

        <nav style={styles.nav}>
          {[
            "Dashboard",
            "Apartments",
            "Tenants",
            "Payments",
            "Reports",
            "Complaints",
            "AI Insights",
            "Settings",
          ].map((item, i) => (
            <div
              key={item}
              style={{
                ...styles.navItem,
                ...(i === 0 ? styles.activeNavItem : {}),
              }}
            >
              {item}
            </div>
          ))}
        </nav>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <input
            type="text"
            placeholder="search apartments, tenants or documents"
            style={styles.search}
          />

          <div style={styles.userBox}>
            <div>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userEmail}>{user.email}</div>
            </div>
            <button onClick={logout} style={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </header>

        <section style={styles.statsGrid}>
          {stats.map((item) => (
            <div key={item.title} style={styles.card}>
              <div style={styles.cardTitle}>{item.title}</div>
              <div style={styles.cardValue}>{item.value}</div>
              <div style={styles.cardChange}>{item.change}</div>
            </div>
          ))}
        </section>

        <section style={styles.contentGrid}>
          <div style={styles.chartCard}>
            <h3 style={styles.sectionTitle}>Monthly Rent Collection</h3>
            <p style={styles.sectionSub}>Overview of collected vs pending rent</p>

            <div style={styles.chartArea}>
              {chartData.map((value, index) => {
                const height = (value / maxValue) * 180;
                return (
                  <div key={index} style={styles.barGroup}>
                    <div
                      style={{
                        ...styles.bar,
                        height: `${height}px`,
                      }}
                    />
                    <span style={styles.barLabel}>{months[index]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.aiCard}>
            <h3 style={{ marginTop: 0 }}>AI Insights</h3>

            <div style={styles.insightBox}>
              <strong>Revenue Optimization</strong>
              <p style={styles.insightText}>
                Apartments in Block B can increase rent by 5%.
              </p>
            </div>

            <div style={styles.insightBox}>
              <strong>Predictive Maintenance</strong>
              <p style={styles.insightText}>
                Water line issue may occur in next 7 days.
              </p>
            </div>

            <div style={styles.insightBox}>
              <strong>Tenant Retention</strong>
              <p style={styles.insightText}>
                3 tenants may need renewal attention this month.
              </p>
            </div>

            <button style={styles.viewBtn}>View All Insights</button>
          </div>
        </section>

        <section style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <div>
              <h3 style={styles.sectionTitle}>Recent Activity</h3>
              <p style={styles.sectionSub}>Latest transactions and updates</p>
            </div>
            <a href="#" style={styles.viewAll}>
              View All
            </a>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Apartment</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((item, index) => (
                <tr key={index}>
                  <td style={styles.td}>{item.tenant}</td>
                  <td style={styles.td}>{item.apartment}</td>
                  <td style={styles.td}>{item.action}</td>
                  <td style={styles.td}>{item.amount}</td>
                  <td style={styles.td}>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    width: "240px",
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    padding: "24px 18px",
  },
  logo: {
    fontSize: "22px",
    fontWeight: 700,
    marginBottom: "32px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  navItem: {
    padding: "12px 14px",
    borderRadius: "10px",
    color: "#374151",
    cursor: "pointer",
    fontWeight: 500,
  },
  activeNavItem: {
    background: "#eef2ff",
    color: "#4f46e5",
  },
  main: {
    flex: 1,
    padding: "24px",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  search: {
    flex: 1,
    maxWidth: "420px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    outline: "none",
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userName: {
    fontWeight: 700,
    fontSize: "14px",
  },
  userEmail: {
    fontSize: "12px",
    color: "#6b7280",
  },
  logoutBtn: {
    padding: "10px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "8px",
  },
  cardValue: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "6px",
  },
  cardChange: {
    fontSize: "13px",
    color: "#10b981",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "16px",
    marginBottom: "24px",
  },
  chartCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  aiCard: {
    background: "#1d4ed8",
    color: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
  },
  sectionSub: {
    marginTop: "6px",
    marginBottom: "20px",
    color: "#6b7280",
    fontSize: "13px",
  },
  chartArea: {
    height: "240px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: "18px",
    padding: "20px 10px 10px",
    border: "1px solid #eef2f7",
    borderRadius: "12px",
    background: "#fafbff",
  },
  barGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
  },
  bar: {
    width: "34px",
    background: "#8b7cf6",
    borderRadius: "10px 10px 0 0",
  },
  barLabel: {
    fontSize: "12px",
    color: "#6b7280",
  },
  insightBox: {
    background: "rgba(255,255,255,0.12)",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "12px",
  },
  insightText: {
    margin: "6px 0 0",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  viewBtn: {
    width: "100%",
    marginTop: "8px",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "#ffffff",
    color: "#1d4ed8",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  viewAll: {
    color: "#4f46e5",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    fontSize: "13px",
  },
  td: {
    padding: "14px 10px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
  },
};
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef4ff 0%, #f8fbff 45%, #ffffff 100%)",
        fontFamily: "Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              boxShadow: "0 10px 24px rgba(79,70,229,0.25)",
            }}
          >
            T
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
              TenantSync
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
              Smart apartment and tenant management
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "1px solid #c7d2fe",
                background: "#ffffff",
                color: "#4338ca",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
              }}
            >
              Login
            </button>
          </Link>

          <Link to="/register" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(79,70,229,0.28)",
              }}
            >
              Register
            </button>
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1250,
          margin: "0 auto",
          padding: "30px 56px 70px",
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: 36,
          alignItems: "center",
        }}
      >
        <section>
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: 999,
              background: "#e0e7ff",
              color: "#4338ca",
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            Welcome to TenantSync
          </div>

          <h1
            style={{
              fontSize: 56,
              lineHeight: 1.08,
              margin: "0 0 18px",
              fontWeight: 900,
              color: "#111827",
            }}
          >
            Manage apartments,
            <br />
            tenants, payments
            <br />
            and communication
            <span style={{ color: "#4f46e5" }}> with confidence.</span>
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.8,
              color: "#4b5563",
              maxWidth: 760,
              marginBottom: 28,
            }}
          >
            TenantSync is a clean and powerful platform designed to make apartment
            management easier, smarter, and more organized for admins, managers,
            and tenants.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 30,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 18,
                padding: 20,
                boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
                border: "1px solid #eef2ff",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px",
                  color: "#2563eb",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                Shams
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#4b5563",
                  lineHeight: 1.7,
                  fontSize: 15,
                }}
              >
                Shams is a very good boy with a sincere mind, strong dedication,
                and a respectful attitude. He brings positivity, effort, and
                reliability into everything he does.
              </p>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: 18,
                padding: 20,
                boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
                border: "1px solid #eef2ff",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px",
                  color: "#7c3aed",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                Lubna
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#4b5563",
                  lineHeight: 1.7,
                  fontSize: 15,
                }}
              >
                Lubna is warm, kind, and supportive. She has a bright presence and
                a caring personality, and she is known as Nabil&apos;s bestie,
                making every team or friendship circle feel more cheerful.
              </p>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: 18,
                padding: 20,
                boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
                border: "1px solid #eef2ff",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px",
                  color: "#059669",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                Nabil
              </h3>
              <p
                style={{
                  margin: 0,
                  color: "#4b5563",
                  lineHeight: 1.7,
                  fontSize: 15,
                }}
              >
                Nabil is thoughtful, dependable, and intelligent. He values strong
                friendships, works with focus, and stands out as someone people
                can trust and appreciate.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <Link to="/register" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "14px 24px",
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  boxShadow: "0 12px 28px rgba(79,70,229,0.25)",
                }}
              >
                Get Started
              </button>
            </Link>

            <Link to="/login" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "14px 24px",
                  borderRadius: 14,
                  border: "1px solid #dbe4ff",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
            </Link>
          </div>
        </section>

        <section>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 28,
              padding: 28,
              boxShadow: "0 20px 48px rgba(15,23,42,0.10)",
              border: "1px solid #eef2ff",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #4338ca, #06b6d4)",
                borderRadius: 22,
                padding: 24,
                color: "#fff",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 13,
                  opacity: 0.9,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Platform Highlights
              </p>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
                Everything you need in one dashboard
              </h3>
              <p
                style={{
                  margin: "12px 0 0",
                  lineHeight: 1.7,
                  fontSize: 15,
                  opacity: 0.95,
                }}
              >
                Track rent, handle complaints, view tenant activities, and manage
                apartment operations in a simple and organized way.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {[
                {
                  title: "Tenant Management",
                  text: "Keep tenant information, apartment details, and records organized.",
                },
                {
                  title: "Payment Tracking",
                  text: "Monitor rent status, monthly payments, and due information easily.",
                },
                {
                  title: "Complaint Handling",
                  text: "View issues quickly and manage maintenance in a streamlined flow.",
                },
                {
                  title: "AI Support",
                  text: "Use AI-powered insights and assistance for better decisions.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: "#f8fbff",
                    border: "1px solid #e6eeff",
                    borderRadius: 18,
                    padding: 18,
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px",
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#1f2937",
                    }}
                  >
                    {item.title}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      color: "#6b7280",
                      lineHeight: 1.7,
                      fontSize: 14,
                    }}
                  >
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import "./Landing.css";
import logo from "../assets/logo.png";

const API = "http://localhost:8000/api";

type User = {
  id: number;
  role?: "admin" | "manager" | "tenant" | string;
};

function safeParseUser(raw: string | null): User | null {
  if (!raw || raw === "undefined" || raw === "null") return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem("ts_user");
    return null;
  }
}

function getDashboardPath(role?: string) {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "manager":
      return "/dashboard-manager";
    case "tenant":
      return "/dashboard-tenant";
    default:
      return "/login";
  }
}

export default function Landing() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginRoute = location.pathname === "/login";
  const currentUser = safeParseUser(localStorage.getItem("ts_user"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginActive, setLoginActive] = useState(isLoginRoute);
  const skylineBuildings = [
    "tower-1",
    "tower-2",
    "tower-3",
    "tower-4",
    "tower-5",
    "tower-6",
    "tower-7",
    "tower-8",
    "tower-9",
    "tower-10",
    "tower-11",
    "tower-12",
    "tower-13",
    "tower-14",
  ];

  useEffect(() => {
    setMsg("");
    setLoginActive(isLoginRoute);
  }, [isLoginRoute]);

  function transitionTo(path: "/" | "/login") {
    if (path === location.pathname) return;
    navigate(path, { replace: false });
  }

  if (isLoginRoute && currentUser) {
    return <Navigate to={getDashboardPath(currentUser.role)} replace />;
  }

  async function submitLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.message ?? `Login failed (HTTP ${res.status})`);
        return;
      }

      if (!data?.user) {
        setMsg("Login succeeded but no user returned.");
        return;
      }

      localStorage.setItem("ts_user", JSON.stringify(data.user));
      sessionStorage.removeItem("ts_user");
      setEmail("");
      setPassword("");
      navigate(getDashboardPath(data.user.role), { replace: true });
    } catch {
      setMsg("Network error: backend is not reachable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="landing-page">

      {/* Navbar */}
      <header className="navbar">
        <div className="logo-section">
          <img src={logo} alt="logo" />
          <h2>TenantSync</h2>
        </div>

        <nav className="nav-links"></nav>

        <div className="auth-buttons">
          <button
            className={`login-btn ${!loginActive ? "is-current" : ""}`}
            onClick={() => transitionTo("/")}
          >
            Home
          </button>
          <button
            className={`register-btn ${loginActive ? "is-current" : ""}`}
            onClick={() => transitionTo("/login")}
          >
            Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className={`hero-left ${loginActive ? "hero-left--login-focus" : ""}`}>
          <span className="hero-badge">
            {loginActive ? "Secure Member Access" : "Smart Property Management"}
          </span>

          <h1>
            {loginActive ? (
              <>
                Sign In and Continue Your <span>TenantSync</span> Workflow
              </>
            ) : (
              <>
                Manage Apartments, <span>Tenants</span>, and Operations in One
                Place
              </>
            )}
          </h1>

          <p>
            {loginActive
              ? "Your login now appears directly inside the home experience, so the transition feels smoother, smarter, and much more modern."
              : "TenantSync simplifies apartment management for admins, managers, and tenants with role-based dashboards, complaint tracking, secure records, and smooth communication."}
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => transitionTo(loginActive ? "/" : "/login")}
            >
              {loginActive ? "Back to Home" : "Get Started"}
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat-box">
              <h3>3+</h3>
              <p>User Roles</p>
            </div>
            <div className="stat-box">
              <h3>24/7</h3>
              <p>Complaint Tracking</p>
            </div>
            <div className="stat-box">
              <h3>100%</h3>
              <p>Secure Access</p>
            </div>
          </div>
        </div>

        <div className={`hero-right ${loginActive ? "hero-right--login" : ""}`}>
          <div className="image-overlay"></div>

          <div className="hero-visual-stage">
            <div
              className={`skyline-scene-wrapper ${
                loginActive ? "skyline-scene-wrapper--hidden" : ""
              }`}
              aria-hidden={loginActive}
            >
              <div className="skyline-scene">
                <div className="skyline-glow"></div>
                <div className="skyline-mist"></div>
                <div className="skyline-row">
                  {skylineBuildings.map((building) => (
                    <span
                      key={building}
                      className={`skyline-tower ${building}`}
                    ></span>
                  ))}
                </div>
                <div className="waterline"></div>
                <div className="skyline-reflection">
                  {skylineBuildings.map((building) => (
                    <span
                      key={`reflection-${building}`}
                      className={`skyline-tower reflection ${building}`}
                    ></span>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`hero-login-shell ${
                loginActive ? "hero-login-shell--visible" : ""
              }`}
            >
              <div className="hero-login-card">
                <div className="hero-login-accent"></div>

                <div className="hero-login-topline">
                  <span className="hero-login-kicker">TenantSync Access</span>
                  <span className="hero-login-status">Live Secure Login</span>
                </div>

                <div className="hero-login-header">
                  <h2>Welcome back</h2>
                  <p>
                    Sign in from the landing screen and jump straight into your
                    apartment management dashboard.
                  </p>
                </div>

                <form
                  onSubmit={submitLogin}
                  className="hero-login-form"
                  autoComplete="off"
                >
                  <label className="hero-login-field">
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="username"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>

                  <label className="hero-login-field">
                    <span>Password</span>
                    <input
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>

                  <button
                    type="submit"
                    className="hero-login-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </button>

                  <p className="hero-login-help">
                    Use your existing TenantSync login credentials.
                  </p>
                </form>

                {msg && (
                  <div
                    className={`hero-login-message ${
                      msg.toLowerCase().includes("successful")
                        ? "success"
                        : "error"
                    }`}
                  >
                    {msg}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
<section className="features-section" id="features">
  <h2>Why Choose TenantSync?</h2>
  <p className="section-subtitle">
    Built to simplify modern apartment and tenant management with a secure,
    organized, and role-based system.
  </p>

  <div className="features-grid">
    <div className="feature-card">
      <h3>Apartment Management</h3>
      <p>Manage buildings, apartments, units, and occupancy details from one place.</p>
    </div>

    <div className="feature-card">
      <h3>Tenant Records</h3>
      <p>Store and manage tenant information, rent status, and occupancy history securely.</p>
    </div>

    <div className="feature-card">
      <h3>Complaint Tracking</h3>
      <p>Allow tenants to submit issues and help managers track resolutions efficiently.</p>
    </div>

    <div className="feature-card">
      <h3>Role-Based Access</h3>
      <p>Separate dashboards and permissions for admin, manager, and tenant users.</p>
    </div>
  </div>
</section>

      {/* Footer */}
<footer className="footer">
  <div className="footer-content">
    <h3>TenantSync</h3>
    <p>Smart apartment and tenant management for modern living.</p>
    <span>Â© 2026 TenantSync. All rights reserved.</span>
  </div>
</footer>

    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";

const API = "http://localhost:8000/api";

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`${API}/auth/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          localStorage.removeItem("ts_user");
          sessionStorage.removeItem("ts_user");
          setUser(null);
          return;
        }

        const data = await res.json();

        if (!data?.id) {
          localStorage.removeItem("ts_user");
          sessionStorage.removeItem("ts_user");
          setUser(null);
          return;
        }

        localStorage.setItem("ts_user", JSON.stringify(data));
        setUser(data);
      } catch {
        localStorage.removeItem("ts_user");
        sessionStorage.removeItem("ts_user");
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

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
      setUser(data.user);
      setMsg("Login successful");
      setEmail("");
      setPassword("");
    } catch {
      setMsg("Network error: backend is not reachable.");
    }
  }

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network error here, still clear local UI state
    }

    localStorage.removeItem("ts_user");
    sessionStorage.removeItem("ts_user");
    setUser(null);
    setEmail("");
    setPassword("");
    setMsg("Logged out");
  }

  if (checkingAuth) {
    return (
      <div className="auth-page">
        <div className="auth-shell auth-shell--loading">
          <div className="auth-loading-card">
            <div className="auth-spinner"></div>
            <h2>Checking login status...</h2>
            <p>Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-shape auth-bg-shape--one"></div>
      <div className="auth-bg-shape auth-bg-shape--two"></div>

      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-left login-left">
            <div className="auth-brand-block fade-up">
              <span className="auth-badge">TenantSync</span>
              <h1>Welcome Back</h1>
              <p>
                Sign in to manage tenants, complaints, rent records, and daily
                apartment operations in one place.
              </p>
            </div>

            <div className="auth-visual glass-card fade-up delay-1">
              <div className="auth-visual-overlay"></div>
              <div className="auth-building">
                <div className="window-grid">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i}></span>
                  ))}
                </div>
              </div>
              <div className="auth-visual-content">
                <h3>Smart Property Management</h3>
                <p>Fast, organized, and simple access for your TenantSync workflow.</p>
              </div>
            </div>

            <div className="auth-stats fade-up delay-2">
              <div className="stat-card">
                <strong>Secure</strong>
                <span>Protected session login</span>
              </div>
              <div className="stat-card">
                <strong>Modern</strong>
                <span>Clean and responsive UI</span>
              </div>
            </div>
          </div>

          <div className="auth-right slide-in-right">
            <div className="auth-form-wrap">
              <div className="auth-form-header">
                <h2>Sign In</h2>
                <p>Enter your email and password to access your account</p>
              </div>

              {!user ? (
                <form onSubmit={submit} className="auth-form" autoComplete="off">
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      autoComplete="username"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <input
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="auth-btn primary-btn">
                    Sign In
                  </button>

                  <div className="auth-switch-text">
                    Don&apos;t have an account? <Link to="/register">Create one</Link>
                  </div>
                </form>
              ) : (
                <div className="logged-user-card">
                  <div className="logged-avatar">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <button onClick={logout} className="auth-btn danger-btn">
                    Logout
                  </button>
                </div>
              )}

              {msg && (
                <div
                  className={`auth-message ${
                    msg.toLowerCase().includes("successful") ? "success" : "error"
                  }`}
                >
                  {msg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
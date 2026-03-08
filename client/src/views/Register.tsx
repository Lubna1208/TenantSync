import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API = "http://localhost:8000/api";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [msg, setMsg] = useState("");

  async function clearAuthState() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network error
    }

    localStorage.removeItem("ts_user");
    localStorage.removeItem("ts_token");
    sessionStorage.removeItem("ts_user");
  }

  async function goToLoginWithoutAuth() {
    await clearAuthState();
    nav("/login", { replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          date_of_birth: dob || null,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errors = data?.errors ? JSON.stringify(data.errors) : "";
        setMsg((data?.message ?? "Register failed") + (errors ? ` ${errors}` : ""));
        return;
      }

      setMsg("Registration successful. Please log in.");
      setName("");
      setEmail("");
      setDob("");
      setPassword("");
      setPasswordConfirmation("");

      setTimeout(() => {
        void goToLoginWithoutAuth();
      }, 700);
    } catch {
      setMsg("Network error: backend is not reachable.");
    }
  }

  async function handleLoginLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    await goToLoginWithoutAuth();
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-shape auth-bg-shape--one"></div>
      <div className="auth-bg-shape auth-bg-shape--two"></div>

      <div className="auth-shell">
        <div className="auth-card register-mode">
          <div className="auth-right auth-right--register slide-in-left">
            <div className="auth-form-wrap">
              <div className="auth-form-header">
                <h2>Create Account</h2>
                <p>Fill in your details to create your TenantSync account</p>
              </div>

              <form onSubmit={submit} className="auth-form" autoComplete="off">
                <div className="input-group">
                  <label>Name</label>
                  <input
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Email</label>
                  <input
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <input
                    autoComplete="new-password"
                    placeholder="Create password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Confirm Password</label>
                  <input
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                  />
                </div>

                <button type="submit" className="auth-btn primary-btn">
                  Create Account
                </button>

                <div className="auth-switch-text">
                  Already have an account?{" "}
                  <Link to="/login" onClick={handleLoginLinkClick}>
                    Sign in
                  </Link>
                </div>
              </form>

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

          <div className="auth-left register-left">
            <div className="register-panel fade-up">
              <span className="auth-badge light">Join TenantSync</span>
              <h1>Hello, Friend!</h1>
              <p>
                Register with your personal details and start using all the
                smart features of the TenantSync system.
              </p>

              <div className="feature-list">
                <div className="feature-item">
                  <span className="feature-dot"></span>
                  <span>Simple account creation</span>
                </div>
                <div className="feature-item">
                  <span className="feature-dot"></span>
                  <span>Responsive modern interface</span>
                </div>
                <div className="feature-item">
                  <span className="feature-dot"></span>
                  <span>Ready for your backend integration</span>
                </div>
              </div>

              <div className="mini-preview fade-up delay-1">
                <div className="mini-card"></div>
                <div className="mini-card short"></div>
                <div className="mini-card"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

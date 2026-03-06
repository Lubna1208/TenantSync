import { useEffect, useState } from "react";

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
        });

        if (!res.ok) {
          localStorage.removeItem("ts_user");
          setUser(null);
          return;
        }

        const data = await res.json();
        localStorage.setItem("ts_user", JSON.stringify(data));
        setUser(data);
      } catch {
        localStorage.removeItem("ts_user");
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
    setUser(null);
    setEmail("");
    setPassword("");
    setMsg("Logged out");
  }

  if (checkingAuth) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Login</h2>
        <p>Checking login status...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Login</h2>

      {!user ? (
        <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <div>
          <p>
            Logged in as: {user.name} ({user.email})
          </p>
          <button onClick={logout}>Logout</button>
        </div>
      )}

      {msg && <p>{msg}</p>}
    </div>
  );
}
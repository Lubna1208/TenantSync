import { useState } from "react";

const API = "http://localhost:8000/api";

type User = { id: number; name: string; email: string; date_of_birth?: string | null };

function safeParseUser(raw: string | null): User | null {
  if (!raw) return null;
  // Handle cases like "undefined" or "null" saved as text
  if (raw === "undefined" || raw === "null") return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    // Corrupted storage -> clear it
    localStorage.removeItem("ts_user");
    return null;
  }
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState<User | null>(() => safeParseUser(localStorage.getItem("ts_user")));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Read as text first so we don't crash if server returns HTML/error
      const text = await res.text();

      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        setMsg("Server returned invalid response (not JSON). Check backend logs.");
        return;
      }

      if (!res.ok) {
        setMsg(data?.message ?? `Login failed (HTTP ${res.status})`);
        return;
      }

      if (!data?.user) {
        setMsg("Login ok but no user returned. Check backend response.");
        return;
      }

      localStorage.setItem("ts_user", JSON.stringify(data.user));
      setUser(data.user);
      setMsg("Login successful");
    } catch (err) {
      setMsg("Network error: backend is not reachable.");
    }
  }

  function logout() {
    localStorage.removeItem("ts_user");
    setUser(null);
    setEmail("");
    setPassword("");
    setMsg("Logged out");
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Login</h2>

      {!user ? (
        <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
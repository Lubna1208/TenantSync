import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000/api";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
  e.preventDefault();
  setMsg("");

  const payload = {
    name: name.trim(),
    email: email.trim(),
    date_of_birth: dob || null,
    password,
  };

  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // show exact validation errors if provided
    const errors = data?.errors ? JSON.stringify(data.errors) : "";
    setMsg((data?.message ?? "Register failed") + (errors ? `\n${errors}` : ""));
    return;
  }

  setMsg("Registered! Redirecting to login...");
  setTimeout(() => nav("/login"), 700);
}
  return (
    <div style={{ padding: 24 }}>
      <h2>Register</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Create Account</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
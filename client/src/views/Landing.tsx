import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div style={{ padding: 24 }}>
      <h1>TenantSync</h1>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/register"><button>Register</button></Link>
        <Link to="/login"><button>Login</button></Link>
      </div>
    </div>
  );
}
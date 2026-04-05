type ManagerHeaderProps = {
  user: {
    name: string;
    email?: string;
  };
  onLogout: () => void;
};

export default function ManagerHeader({ user, onLogout }: ManagerHeaderProps) {
  return (
    <div className="manager-header">
      {/* Left */}
      <div>
        <h2>Manager Dashboard</h2>
        <p style={{ margin: 0, color: "#aac6dc" }}>
          Welcome back, {user.name}
        </p>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        {/* Notification */}
        <span style={{ fontSize: "18px", cursor: "pointer" }}>🔔</span>

        {/* Profile */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "bold", color: "#f4fbff" }}>{user.name}</div>
          <div style={{ fontSize: "12px", color: "#9cb8d0" }}>
            {user.email || "Manager"}
          </div>
        </div>

        {/* Logout */}
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

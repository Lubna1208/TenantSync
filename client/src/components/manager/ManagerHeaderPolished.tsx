type ManagerHeaderPolishedProps = {
  user: {
    name: string;
    email?: string;
  };
  onLogout: () => void;
};

export default function ManagerHeaderPolished({
  user,
  onLogout,
}: ManagerHeaderPolishedProps) {
  return (
    <div className="manager-header">
      <div className="manager-header-copy">
        <div className="manager-console-badge">Manager Console</div>
        <h2>Manage units, tenants, and updates</h2>
        <p>
          Add units, assign tenants, record rent payments, and publish
          announcements from one place.
        </p>
      </div>

      <div className="manager-header-profile">
        <div className="manager-header-user">
          <div className="manager-header-user-name">{user.name}</div>
          <div className="manager-header-user-email">
            {user.email || "Manager"}
          </div>
        </div>

        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

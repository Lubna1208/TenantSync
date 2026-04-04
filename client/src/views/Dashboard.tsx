import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000/api";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
  status?: string;
};

type Manager = {
  id: number;
  name: string;
  email: string;
  managed_apartments_count?: number;
};

type Unit = {
  id: number;
  unit_number: string;
};

type Property = {
  id: number;
  name: string;
  address: string;
  total_units: number;
  manager_id?: number | null;
  manager?: Manager | null;
  units?: Unit[];
};

function safeParseUser(raw: string | null): User | null {
  if (!raw || raw === "undefined" || raw === "null") {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem("ts_user");
    return null;
  }
}

async function parseResponse<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [managerForm, setManagerForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    address: "",
    total_units: "",
    manager_id: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (user.role !== "admin") {
      navigate("/login", { replace: true });
      return;
    }

    void loadOwnerData();
  }, [navigate, user]);

  async function loadOwnerData() {
    setLoading(true);
    setError("");

    try {
      const [propertiesRes, managersRes] = await Promise.all([
        fetch(`${API}/owner/properties`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${API}/owner/managers`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (!propertiesRes.ok || !managersRes.ok) {
        localStorage.removeItem("ts_user");
        setUser(null);
        navigate("/login", { replace: true });
        return;
      }

      const propertiesData = await parseResponse<{ data?: Property[] }>(
        propertiesRes
      );
      const managersData = await parseResponse<{ data?: Manager[] }>(managersRes);

      setProperties(propertiesData?.data ?? []);
      setManagers(managersData?.data ?? []);
    } catch {
      setError("Owner data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
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
    setUser(null);
    navigate("/login", { replace: true });
  }

  function setSuccess(text: string) {
    setMessage(text);
    setError("");
  }

  function setFailure(text: string) {
    setError(text);
    setMessage("");
  }

  async function createManager(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/owner/managers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(managerForm),
      });

      const data = await parseResponse<{ message?: string; errors?: unknown }>(res);

      if (!res.ok) {
        setFailure(data?.message ?? "Manager creation failed.");
        return;
      }

      setManagerForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
      });
      setSuccess(data?.message ?? "Manager created successfully.");
      await loadOwnerData();
    } catch {
      setFailure("Network error while creating manager.");
    }
  }

  async function createProperty(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/owner/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...propertyForm,
          total_units: Number(propertyForm.total_units),
          manager_id: propertyForm.manager_id
            ? Number(propertyForm.manager_id)
            : null,
        }),
      });

      const data = await parseResponse<{ message?: string }>(res);

      if (!res.ok) {
        setFailure(data?.message ?? "Property creation failed.");
        return;
      }

      setPropertyForm({
        name: "",
        address: "",
        total_units: "",
        manager_id: "",
      });
      setSuccess(data?.message ?? "Property created successfully.");
      await loadOwnerData();
    } catch {
      setFailure("Network error while creating property.");
    }
  }

  async function removeManager(id: number) {
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/owner/managers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await parseResponse<{ message?: string }>(res);

      if (!res.ok) {
        setFailure(data?.message ?? "Manager removal failed.");
        return;
      }

      setSuccess(data?.message ?? "Manager removed successfully.");
      await loadOwnerData();
    } catch {
      setFailure("Network error while removing manager.");
    }
  }

  async function removeProperty(id: number) {
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/owner/properties/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await parseResponse<{ message?: string }>(res);

      if (!res.ok) {
        setFailure(data?.message ?? "Property deletion failed.");
        return;
      }

      setSuccess(data?.message ?? "Property deleted successfully.");
      await loadOwnerData();
    } catch {
      setFailure("Network error while deleting property.");
    }
  }

  async function assignManager(propertyId: number, managerId: string) {
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API}/owner/properties/${propertyId}/manager`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          manager_id: managerId ? Number(managerId) : null,
        }),
      });

      const data = await parseResponse<{ message?: string }>(res);

      if (!res.ok) {
        setFailure(data?.message ?? "Manager assignment failed.");
        return;
      }

      setSuccess(data?.message ?? "Manager assignment updated.");
      await loadOwnerData();
    } catch {
      setFailure("Network error while assigning manager.");
    }
  }

  if (!user) {
    return null;
  }

  const assignedProperties = properties.filter((property) => property.manager).length;
  const unassignedProperties = properties.length - assignedProperties;
  const visibleUnits = properties.reduce(
    (count, property) => count + (property.units?.length ?? 0),
    0
  );

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.badge}>Owner Console</div>
          <h1 style={styles.heroTitle}>Manage properties and managers</h1>
          <p style={styles.heroText}>
            Create buildings, create manager accounts, and assign each property
            to the right manager from one place.
          </p>
        </div>

        <div style={styles.userCard}>
          <div style={styles.userName}>{user.name}</div>
          <div style={styles.userEmail}>{user.email}</div>
          <button onClick={logout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Properties</span>
          <strong style={styles.statValue}>{properties.length}</strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Managers</span>
          <strong style={styles.statValue}>{managers.length}</strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Assigned Properties</span>
          <strong style={styles.statValue}>{assignedProperties}</strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Visible Units</span>
          <strong style={styles.statValue}>
            {visibleUnits} / {properties.reduce((sum, item) => sum + item.total_units, 0)}
          </strong>
        </div>
      </section>

      {(message || error) && (
        <div
          style={{
            ...styles.notice,
            ...(error ? styles.noticeError : styles.noticeSuccess),
          }}
        >
          {error || message}
        </div>
      )}

      <section style={styles.formGrid}>
        <form onSubmit={createProperty} style={styles.panel}>
          <h2 style={styles.panelTitle}>Create Property</h2>
          <p style={styles.panelText}>
            Add a building first, then optionally assign a manager now or later.
          </p>

          <input
            style={styles.input}
            placeholder="Property name"
            value={propertyForm.name}
            onChange={(e) =>
              setPropertyForm((current) => ({ ...current, name: e.target.value }))
            }
          />
          <input
            style={styles.input}
            placeholder="Property address"
            value={propertyForm.address}
            onChange={(e) =>
              setPropertyForm((current) => ({
                ...current,
                address: e.target.value,
              }))
            }
          />
          <input
            style={styles.input}
            type="number"
            min="1"
            placeholder="Total units"
            value={propertyForm.total_units}
            onChange={(e) =>
              setPropertyForm((current) => ({
                ...current,
                total_units: e.target.value,
              }))
            }
          />
          <select
            style={styles.input}
            value={propertyForm.manager_id}
            onChange={(e) =>
              setPropertyForm((current) => ({
                ...current,
                manager_id: e.target.value,
              }))
            }
          >
            <option value="">Assign manager later</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>

          <button type="submit" style={styles.primaryBtn}>
            Save Property
          </button>
        </form>

        <form onSubmit={createManager} style={styles.panel}>
          <h2 style={styles.panelTitle}>Create Manager</h2>
          <p style={styles.panelText}>
            The owner creates the manager's email and password for first login.
          </p>

          <input
            style={styles.input}
            placeholder="Manager name"
            value={managerForm.name}
            onChange={(e) =>
              setManagerForm((current) => ({ ...current, name: e.target.value }))
            }
          />
          <input
            style={styles.input}
            type="email"
            placeholder="Manager email"
            value={managerForm.email}
            onChange={(e) =>
              setManagerForm((current) => ({ ...current, email: e.target.value }))
            }
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={managerForm.password}
            onChange={(e) =>
              setManagerForm((current) => ({
                ...current,
                password: e.target.value,
              }))
            }
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Confirm password"
            value={managerForm.password_confirmation}
            onChange={(e) =>
              setManagerForm((current) => ({
                ...current,
                password_confirmation: e.target.value,
              }))
            }
          />

          <button type="submit" style={styles.primaryBtn}>
            Save Manager
          </button>
        </form>
      </section>

      <section style={styles.listGrid}>
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.panelTitle}>Properties</h2>
              <p style={styles.panelText}>
                {unassignedProperties} properties still need a manager assignment.
              </p>
            </div>
          </div>

          {loading ? (
            <p style={styles.emptyText}>Loading properties...</p>
          ) : properties.length === 0 ? (
            <p style={styles.emptyText}>No properties created yet.</p>
          ) : (
            <div style={styles.stack}>
              {properties.map((property) => (
                <div key={property.id} style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <div>
                      <h3 style={styles.itemTitle}>{property.name}</h3>
                      <p style={styles.itemSub}>{property.address}</p>
                    </div>
                    <button
                      onClick={() => void removeProperty(property.id)}
                      style={styles.dangerBtn}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={styles.metaRow}>
                    <span style={styles.metaPill}>
                      Planned units: {property.total_units}
                    </span>
                    <span style={styles.metaPill}>
                      Saved units: {property.units?.length ?? 0}
                    </span>
                  </div>

                  <div style={styles.assignRow}>
                    <select
                      style={styles.inlineSelect}
                      value={property.manager_id ?? ""}
                      onChange={(e) =>
                        void assignManager(property.id, e.target.value)
                      }
                    >
                      <option value="">Unassigned</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>

                    <span style={styles.assignmentText}>
                      {property.manager
                        ? `${property.manager.name} is managing this property`
                        : "No manager assigned yet"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Managers</h2>
          <p style={styles.panelText}>
            Managers created by this owner can later log in and work on assigned
            properties.
          </p>

          {loading ? (
            <p style={styles.emptyText}>Loading managers...</p>
          ) : managers.length === 0 ? (
            <p style={styles.emptyText}>No managers created yet.</p>
          ) : (
            <div style={styles.stack}>
              {managers.map((manager) => (
                <div key={manager.id} style={styles.itemCard}>
                  <div style={styles.itemHeader}>
                    <div>
                      <h3 style={styles.itemTitle}>{manager.name}</h3>
                      <p style={styles.itemSub}>{manager.email}</p>
                    </div>
                    <button
                      onClick={() => void removeManager(manager.id)}
                      style={styles.dangerBtn}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={styles.metaRow}>
                    <span style={styles.metaPill}>
                      Assigned properties: {manager.managed_apartments_count ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #07111f 0%, #0b1b2f 50%, #07111f 100%)",
    padding: "32px",
    color: "#eef6ff",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
    marginBottom: "24px",
  },
  badge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(18, 183, 255, 0.12)",
    color: "#7ddfff",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "14px",
  },
  heroTitle: {
    fontSize: "42px",
    lineHeight: 1.1,
    margin: "0 0 12px",
  },
  heroText: {
    margin: 0,
    maxWidth: "640px",
    fontSize: "18px",
    lineHeight: 1.6,
    color: "#aac6dc",
  },
  userCard: {
    background: "rgba(8, 19, 34, 0.8)",
    border: "1px solid rgba(18, 183, 255, 0.16)",
    borderRadius: "24px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.22)",
  },
  userName: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "6px",
  },
  userEmail: {
    color: "#9cb8d0",
    marginBottom: "20px",
  },
  logoutBtn: {
    border: "none",
    borderRadius: "14px",
    background: "#163f63",
    color: "#eef6ff",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  statCard: {
    background: "rgba(8, 19, 34, 0.78)",
    borderRadius: "22px",
    padding: "20px",
    border: "1px solid rgba(18, 183, 255, 0.12)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
  },
  statLabel: {
    display: "block",
    fontSize: "13px",
    color: "#95b1c8",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  statValue: {
    fontSize: "28px",
    color: "#f4fbff",
  },
  notice: {
    borderRadius: "16px",
    padding: "14px 16px",
    marginBottom: "20px",
    fontWeight: 600,
  },
  noticeSuccess: {
    background: "rgba(32, 201, 151, 0.14)",
    color: "#8df0cb",
  },
  noticeError: {
    background: "rgba(248, 113, 113, 0.14)",
    color: "#ffb2b2",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "20px",
  },
  listGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.95fr",
    gap: "18px",
  },
  panel: {
    background: "rgba(8, 19, 34, 0.82)",
    borderRadius: "24px",
    padding: "22px",
    border: "1px solid rgba(18, 183, 255, 0.12)",
    boxShadow: "0 16px 36px rgba(0, 0, 0, 0.2)",
  },
  panelTitle: {
    margin: "0 0 8px",
    fontSize: "28px",
    color: "#f3fbff",
  },
  panelText: {
    margin: "0 0 18px",
    color: "#aac6dc",
    lineHeight: 1.6,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "14px",
    border: "1px solid rgba(18, 183, 255, 0.18)",
    padding: "13px 14px",
    fontSize: "15px",
    marginBottom: "12px",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#eef6ff",
  },
  primaryBtn: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    background: "#12b7ff",
    color: "#07111f",
    padding: "14px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  itemCard: {
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(18, 183, 255, 0.1)",
    padding: "16px",
  },
  itemHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "12px",
  },
  itemTitle: {
    margin: "0 0 4px",
    fontSize: "21px",
  },
  itemSub: {
    margin: 0,
    color: "#aac6dc",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "12px",
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(18, 183, 255, 0.12)",
    color: "#c5ecff",
    fontSize: "13px",
    fontWeight: 600,
  },
  assignRow: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    gap: "12px",
    alignItems: "center",
  },
  inlineSelect: {
    width: "100%",
    borderRadius: "12px",
    border: "1px solid rgba(18, 183, 255, 0.18)",
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#eef6ff",
  },
  assignmentText: {
    color: "#aac6dc",
    lineHeight: 1.5,
  },
  dangerBtn: {
    alignSelf: "flex-start",
    border: "none",
    borderRadius: "12px",
    background: "#b94a57",
    color: "#ffffff",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
  emptyText: {
    color: "#aac6dc",
    margin: "8px 0 0",
  },
};

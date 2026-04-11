import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearStoredAuth } from "../api";
import { getApiMessage } from "../helpers/apiMessages";

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

type NoticeContext = "property" | "manager" | "general";

type OwnerStatId = "properties" | "managers" | "assigned" | "units";

type OwnerStat = {
  id: OwnerStatId;
  label: string;
  value: ReactNode;
};

type InlineNotice = {
  key: string;
  text: string;
  tone: "success" | "error";
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

function OwnerStatIcon({ kind }: { kind: OwnerStatId }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (kind) {
    case "properties":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 10h.01" />
          <path d="M15 10h.01" />
          <path d="M9 14h.01" />
          <path d="M15 14h.01" />
        </svg>
      );
    case "managers":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3.25" />
          <path d="M17 11a3 3 0 1 0 0-6" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        </svg>
      );
    case "assigned":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M7 12l3 3 7-7" />
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9" />
        </svg>
      );
    case "units":
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      );
  }
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "MG";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function Dashboard() {
  const navigate = useNavigate();
  const propertySectionRef = useRef<HTMLElement | null>(null);
  const managerSectionRef = useRef<HTMLElement | null>(null);
  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inlineNotice, setInlineNotice] = useState<InlineNotice | null>(null);
  const [noticeContext, setNoticeContext] = useState<NoticeContext | null>(null);
  const [hoveredStat, setHoveredStat] = useState<OwnerStatId | null>(null);
  const [hoveredSurface, setHoveredSurface] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<"property" | "manager" | null>(null);
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
  const visibleNotice = error || message;

  const loadOwnerData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [propertiesRes, managersRes] = await Promise.all([
        api.owner.properties(),
        api.owner.managers(),
      ]);

      if (!propertiesRes.ok || !managersRes.ok) {
        clearStoredAuth();
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
      setFailure("Owner data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

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
  }, [loadOwnerData, navigate, user]);

  useEffect(() => {
    if (!visibleNotice) {
      setNoticeContext(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage("");
      setError("");
      setNoticeContext(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [visibleNotice]);

  useEffect(() => {
    if (!inlineNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInlineNotice((current) =>
        current?.key === inlineNotice.key ? null : current
      );
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [inlineNotice]);

  async function logout() {
    try {
      await api.auth.logout();
    } catch {
      // ignore network error
    }

    clearStoredAuth();
    setUser(null);
    navigate("/login", { replace: true });
  }

  function clearNotice() {
    setMessage("");
    setError("");
    setNoticeContext(null);
  }

  function showInlineNotice(
    key: string,
    text: string,
    tone: InlineNotice["tone"]
  ) {
    setInlineNotice({ key, text, tone });
  }

  function renderInlineNotice(key: string) {
    if (inlineNotice?.key !== key) {
      return null;
    }

    return (
      <div
        style={{
          ...styles.inlineActionNotice,
          ...(inlineNotice.tone === "error"
            ? styles.inlineActionNoticeError
            : styles.inlineActionNoticeSuccess),
        }}
      >
        {inlineNotice.text}
      </div>
    );
  }

  function setFailure(text: string, context: NoticeContext = "general") {
    setError(text);
    setMessage("");
    setNoticeContext(context);
  }

  async function createManager(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    try {
      const res = await api.owner.createManager(managerForm);

      const data = await parseResponse<{ message?: string; errors?: unknown }>(res);

      if (!res.ok) {
        showInlineNotice("create-manager", getApiMessage(data, "Manager creation failed."), "error");
        return;
      }

      setManagerForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
      });
      showInlineNotice("create-manager", data?.message ?? "Manager created successfully.", "success");
      await loadOwnerData();
    } catch {
      showInlineNotice("create-manager", "Network error while creating manager.", "error");
    }
  }

  async function createProperty(e: FormEvent) {
    e.preventDefault();
    clearNotice();

    try {
      const res = await api.owner.createProperty({
        ...propertyForm,
        total_units: Number(propertyForm.total_units),
        manager_id: propertyForm.manager_id
          ? Number(propertyForm.manager_id)
          : null,
      });

      const data = await parseResponse<{ message?: string; errors?: unknown }>(res);

      if (!res.ok) {
        showInlineNotice("create-property", getApiMessage(data, "Property creation failed."), "error");
        return;
      }

      setPropertyForm({
        name: "",
        address: "",
        total_units: "",
        manager_id: "",
      });
      showInlineNotice("create-property", data?.message ?? "Property created successfully.", "success");
      await loadOwnerData();
    } catch {
      showInlineNotice("create-property", "Network error while creating property.", "error");
    }
  }

  async function removeManager(id: number) {
    clearNotice();

    try {
      const res = await api.owner.removeManager(id);

      const data = await parseResponse<{ message?: string }>(res);

      if (!res.ok) {
        showInlineNotice(`remove-manager-${id}`, getApiMessage(data, "Manager removal failed."), "error");
        return;
      }

      showInlineNotice(`remove-manager-${id}`, data?.message ?? "Manager removed successfully.", "success");
      await loadOwnerData();
    } catch {
      showInlineNotice(`remove-manager-${id}`, "Network error while removing manager.", "error");
    }
  }

  async function removeProperty(id: number) {
    clearNotice();

    try {
      const res = await api.owner.removeProperty(id);

      const data = await parseResponse<{ message?: string }>(res);

      if (!res.ok) {
        showInlineNotice(`remove-property-${id}`, getApiMessage(data, "Property deletion failed."), "error");
        return;
      }

      showInlineNotice(`remove-property-${id}`, data?.message ?? "Property deleted successfully.", "success");
      await loadOwnerData();
    } catch {
      showInlineNotice(`remove-property-${id}`, "Network error while deleting property.", "error");
    }
  }

  async function assignManager(propertyId: number, managerId: string) {
    clearNotice();

    try {
      const res = await api.owner.assignManager(
        propertyId,
        managerId ? Number(managerId) : null
      );

      const data = await parseResponse<{ message?: string; errors?: unknown }>(res);

      if (!res.ok) {
        showInlineNotice(`assign-manager-${propertyId}`, getApiMessage(data, "Manager assignment failed."), "error");
        return;
      }

      showInlineNotice(`assign-manager-${propertyId}`, data?.message ?? "Manager assignment updated.", "success");
      await loadOwnerData();
    } catch {
      showInlineNotice(`assign-manager-${propertyId}`, "Network error while assigning manager.", "error");
    }
  }

  if (!user) {
    return null;
  }

  const assignedProperties = properties.filter((property) => property.manager).length;
  const unassignedProperties = properties.length - assignedProperties;
  const totalPlannedUnits = properties.reduce((sum, item) => sum + item.total_units, 0);
  const visibleUnits = properties.reduce(
    (count, property) => count + (property.units?.length ?? 0),
    0
  );
  const ownerStats: OwnerStat[] = [
    {
      id: "properties",
      label: "Properties",
      value: properties.length,
    },
    {
      id: "managers",
      label: "Managers",
      value: managers.length,
    },
    {
      id: "assigned",
      label: "Assigned Properties",
      value: assignedProperties,
    },
    {
      id: "units",
      label: "Visible Units",
      value: (
        <>
          {visibleUnits}
          <span style={styles.statValueMuted}>/{totalPlannedUnits}</span>
        </>
      ),
    },
  ];
  const activeNotice = error || message;

  function getFieldStyle(fieldName: string): CSSProperties {
    return {
      ...styles.input,
      ...(focusedField === fieldName ? styles.inputFocused : undefined),
    };
  }

  function getSelectFieldStyle(fieldName: string): CSSProperties {
    return {
      ...getFieldStyle(fieldName),
      ...styles.selectInput,
    };
  }

  function getActionButtonStyle(kind: "property" | "manager"): CSSProperties {
    return {
      ...styles.primaryBtn,
      ...(hoveredAction === kind ? styles.primaryBtnHover : undefined),
    };
  }

  function getSurfaceStyle(key: string, base: CSSProperties): CSSProperties {
    return {
      ...base,
      ...(hoveredSurface === key ? styles.surfaceHover : undefined),
    };
  }

  function scrollToSection(section: "property" | "manager") {
    const target =
      section === "property" ? propertySectionRef.current : managerSectionRef.current;

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div style={styles.page}>
      <style>
        {`
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(96, 165, 250, 0.52) rgba(15, 23, 42, 0.72);
          }

          *::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }

          *::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.72);
            border-radius: 999px;
          }

          *::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(96, 165, 250, 0.78), rgba(34, 211, 238, 0.62));
            border-radius: 999px;
            border: 2px solid rgba(15, 23, 42, 0.72);
          }

          *::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(125, 211, 252, 0.9), rgba(34, 211, 238, 0.74));
          }

          .admin-list-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(96, 165, 250, 0.52) rgba(15, 23, 42, 0.68);
          }

          .admin-list-scroll::-webkit-scrollbar {
            width: 10px;
          }

          .admin-list-scroll::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.68);
            border-radius: 999px;
          }

          .admin-list-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(96, 165, 250, 0.78), rgba(34, 211, 238, 0.62));
            border-radius: 999px;
            border: 2px solid rgba(15, 23, 42, 0.68);
          }

          .admin-list-scroll::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, rgba(125, 211, 252, 0.9), rgba(34, 211, 238, 0.74));
          }

          .admin-number-input {
            color-scheme: dark;
            appearance: textfield;
            -moz-appearance: textfield;
          }

          .admin-number-input::-webkit-outer-spin-button,
          .admin-number-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        `}
      </style>
      <div style={styles.pageShell}>
        <div style={styles.hero}>
          <div>
            <div style={styles.badge}>Owner Console</div>
            <h1 style={styles.heroTitle}>Manage properties and managers</h1>
            <p style={styles.heroText}>
              Create buildings, create manager accounts, and assign each property
              to the right manager from one place.
            </p>
          </div>

          <div
            style={getSurfaceStyle("user-card", styles.userCard)}
            onMouseEnter={() => setHoveredSurface("user-card")}
            onMouseLeave={() => setHoveredSurface((current) => (
              current === "user-card" ? null : current
            ))}
          >
            <div style={styles.userMeta}>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userEmail}>{user.email}</div>
            </div>
            <button onClick={logout} style={styles.logoutBtn}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.sectionStack}>
      <section style={styles.statsGrid}>
        {ownerStats.map((stat) => (
          <div
            key={stat.id}
            style={{
              ...styles.statCard,
              ...(hoveredStat === stat.id ? styles.statCardHover : undefined),
            }}
            onMouseEnter={() => setHoveredStat(stat.id)}
            onMouseLeave={() => setHoveredStat(null)}
          >
            <div style={styles.statCardTop}>
              <div style={styles.statIconWrap}>
                <OwnerStatIcon kind={stat.id} />
              </div>
              <span style={styles.statLabel}>{stat.label}</span>
            </div>
            <strong style={styles.statValue}>{stat.value}</strong>
          </div>
        ))}
      </section>

      {activeNotice && noticeContext === "general" && (
        <div
          style={{
            ...styles.notice,
            ...(error ? styles.noticeError : styles.noticeSuccess),
          }}
        >
          {activeNotice}
        </div>
      )}

      <section style={styles.managementSection}>
        <div style={styles.managementHeader}>
          <h2 style={styles.managementTitle}>Management Actions</h2>
          <p style={styles.managementText}>
            Create new properties and manager accounts from this control area.
          </p>
        </div>

        <div style={styles.managementActionsGrid}>
          <button
            type="button"
            style={getSurfaceStyle("shortcut-property", styles.managementActionCard)}
            onMouseEnter={() => setHoveredSurface("shortcut-property")}
            onMouseLeave={() => setHoveredSurface((current) => (
              current === "shortcut-property" ? null : current
            ))}
            onClick={() => scrollToSection("property")}
          >
            <strong style={styles.managementActionTitle}>Create Property</strong>
            <span style={styles.managementActionText}>
              Jump to the property form and property list section.
            </span>
          </button>

          <button
            type="button"
            style={getSurfaceStyle("shortcut-manager", styles.managementActionCard)}
            onMouseEnter={() => setHoveredSurface("shortcut-manager")}
            onMouseLeave={() => setHoveredSurface((current) => (
              current === "shortcut-manager" ? null : current
            ))}
            onClick={() => scrollToSection("manager")}
          >
            <strong style={styles.managementActionTitle}>Create Manager</strong>
            <span style={styles.managementActionText}>
              Jump to the manager form and manager list section.
            </span>
          </button>
        </div>
      </section>

      <div style={styles.dashboardRows}>
        <section ref={propertySectionRef} style={styles.pairedSectionBox}>
        <div style={styles.pairedSectionHeader}>
          <span style={styles.pairedSectionEyebrow}>Property Action</span>
        </div>
        <div style={styles.dashboardPairGrid}>
          <form
            onSubmit={createProperty}
            style={getSurfaceStyle("form-property", styles.formCard)}
            onMouseEnter={() => setHoveredSurface("form-property")}
            onMouseLeave={() => setHoveredSurface((current) => (
              current === "form-property" ? null : current
            ))}
          >
            <div style={styles.formCardHeader}>
              <h3 style={styles.formCardTitle}>Create Property</h3>
              <p style={styles.formCardText}>
                Add a building first, then optionally assign a manager now or later.
              </p>
            </div>

            <div style={styles.formFields}>
              <label style={styles.formField}>
                <span style={styles.formLabel}>Property Name</span>
                <input
                  style={getFieldStyle("property_name")}
                  placeholder="Enter property name"
                  value={propertyForm.name}
                  onFocus={() => setFocusedField("property_name")}
                  onBlur={() => setFocusedField((current) => (
                    current === "property_name" ? null : current
                  ))}
                  onChange={(e) =>
                    setPropertyForm((current) => ({ ...current, name: e.target.value }))
                  }
                />
              </label>

              <label style={styles.formField}>
                <span style={styles.formLabel}>Property Address</span>
                <input
                  style={getFieldStyle("property_address")}
                  placeholder="Enter property address"
                  value={propertyForm.address}
                  onFocus={() => setFocusedField("property_address")}
                  onBlur={() => setFocusedField((current) => (
                    current === "property_address" ? null : current
                  ))}
                  onChange={(e) =>
                    setPropertyForm((current) => ({
                      ...current,
                      address: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={styles.formField}>
                <span style={styles.formLabel}>Total Units</span>
                <input
                  className="admin-number-input"
                  style={getFieldStyle("property_units")}
                  type="number"
                  min="1"
                  placeholder="Enter total units"
                  value={propertyForm.total_units}
                  onFocus={() => setFocusedField("property_units")}
                  onBlur={() => setFocusedField((current) => (
                    current === "property_units" ? null : current
                  ))}
                  onChange={(e) =>
                    setPropertyForm((current) => ({
                      ...current,
                      total_units: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={styles.formField}>
                <span style={styles.formLabel}>Assign Manager</span>
                <select
                  style={getSelectFieldStyle("property_manager")}
                  value={propertyForm.manager_id}
                  onFocus={() => setFocusedField("property_manager")}
                  onBlur={() => setFocusedField((current) => (
                    current === "property_manager" ? null : current
                  ))}
                  onChange={(e) =>
                    setPropertyForm((current) => ({
                      ...current,
                      manager_id: e.target.value,
                    }))
                  }
                >
                  <option style={styles.selectOption} value="">
                    Assign manager later
                  </option>
                  {managers.map((manager) => (
                    <option style={styles.selectOption} key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              style={getActionButtonStyle("property")}
              onMouseEnter={() => setHoveredAction("property")}
              onMouseLeave={() => setHoveredAction((current) => (
                current === "property" ? null : current
              ))}
            >
              Save Property
            </button>
            {renderInlineNotice("create-property")}
          </form>

        <div
          style={getSurfaceStyle("panel-properties", styles.panel)}
          onMouseEnter={() => setHoveredSurface("panel-properties")}
          onMouseLeave={() => setHoveredSurface((current) => (
            current === "panel-properties" ? null : current
          ))}
        >
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.listSectionTitle}>Properties</h2>
              <p style={styles.listSectionText}>
                {unassignedProperties} properties still need a manager assignment.
              </p>
            </div>
          </div>

          {loading ? (
            <p style={styles.emptyText}>Loading properties...</p>
          ) : properties.length === 0 ? (
            <p style={styles.emptyText}>No properties created yet.</p>
          ) : (
            <div className="admin-list-scroll" style={styles.listScrollArea}>
              <div style={styles.stack}>
              {properties.map((property) => (
                <div
                  key={property.id}
                  style={getSurfaceStyle(`property-${property.id}`, styles.propertyCard)}
                  onMouseEnter={() => setHoveredSurface(`property-${property.id}`)}
                  onMouseLeave={() => setHoveredSurface((current) => (
                    current === `property-${property.id}` ? null : current
                  ))}
                >
                  <div style={styles.propertyCardLayout}>
                    <div style={styles.propertyCardMain}>
                      <div style={styles.propertyCardHeader}>
                        <div>
                          <h3 style={styles.itemTitle}>{property.name}</h3>
                        </div>
                      </div>

                      <div style={styles.propertyLocationBlock}>
                        <span style={styles.propertyLabel}>Location</span>
                        <p style={styles.propertyLocationText}>{property.address}</p>
                      </div>

                      <div style={styles.metaRow}>
                        <span style={styles.metaPill}>
                          Planned units: {property.total_units}
                        </span>
                        <span style={styles.metaPill}>
                          Saved units: {property.units?.length ?? 0}
                        </span>
                      </div>
                    </div>

                    <div style={styles.propertyActionColumn}>
                      <button
                        onClick={() => void removeProperty(property.id)}
                        style={styles.dangerBtn}
                      >
                        Delete
                      </button>
                      {renderInlineNotice(`remove-property-${property.id}`)}

                      <label style={styles.propertySelectGroup}>
                        <span style={styles.propertyLabel}>Manager</span>
                        <select
                          style={styles.propertyInlineSelect}
                          value={property.manager_id ?? ""}
                          onChange={(e) =>
                            void assignManager(property.id, e.target.value)
                          }
                        >
                          <option style={styles.selectOption} value="">
                            Unassigned
                          </option>
                          {managers.map((manager) => (
                            <option style={styles.selectOption} key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {renderInlineNotice(`assign-manager-${property.id}`)}

                      <span style={styles.propertyAssignmentText}>
                        {property.manager
                          ? `${property.manager.name} is managing this property`
                          : "No manager assigned yet"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
        </div>
        </section>

        <section ref={managerSectionRef} style={styles.pairedSectionBox}>
        <div style={styles.pairedSectionHeader}>
          <span style={styles.pairedSectionEyebrow}>Manager Action</span>
        </div>
        <div style={styles.dashboardPairGrid}>
          <form
            onSubmit={createManager}
            style={getSurfaceStyle("form-manager", styles.formCard)}
            onMouseEnter={() => setHoveredSurface("form-manager")}
            onMouseLeave={() => setHoveredSurface((current) => (
              current === "form-manager" ? null : current
            ))}
          >
            <div style={styles.formCardHeader}>
              <h3 style={styles.formCardTitle}>Create Manager</h3>
              <p style={styles.formCardText}>
                The owner creates the manager&apos;s email and password for first login.
              </p>
            </div>

            <div style={styles.formFields}>
              <label style={styles.formField}>
                <span style={styles.formLabel}>Manager Name</span>
                <input
                  style={getFieldStyle("manager_name")}
                  placeholder="Enter manager name"
                  value={managerForm.name}
                  onFocus={() => setFocusedField("manager_name")}
                  onBlur={() => setFocusedField((current) => (
                    current === "manager_name" ? null : current
                  ))}
                  onChange={(e) =>
                    setManagerForm((current) => ({ ...current, name: e.target.value }))
                  }
                />
              </label>

              <label style={styles.formField}>
                <span style={styles.formLabel}>Manager Email</span>
                <input
                  style={getFieldStyle("manager_email")}
                  type="email"
                  placeholder="Enter manager email"
                  value={managerForm.email}
                  onFocus={() => setFocusedField("manager_email")}
                  onBlur={() => setFocusedField((current) => (
                    current === "manager_email" ? null : current
                  ))}
                  onChange={(e) =>
                    setManagerForm((current) => ({ ...current, email: e.target.value }))
                  }
                />
              </label>

              <label style={styles.formField}>
                <span style={styles.formLabel}>Password</span>
                <input
                  style={getFieldStyle("manager_password")}
                  type="password"
                  placeholder="Enter password"
                  value={managerForm.password}
                  onFocus={() => setFocusedField("manager_password")}
                  onBlur={() => setFocusedField((current) => (
                    current === "manager_password" ? null : current
                  ))}
                  onChange={(e) =>
                    setManagerForm((current) => ({
                      ...current,
                      password: e.target.value,
                    }))
                  }
                />
              </label>

              <label style={styles.formField}>
                <span style={styles.formLabel}>Confirm Password</span>
                <input
                  style={getFieldStyle("manager_password_confirmation")}
                  type="password"
                  placeholder="Confirm password"
                  value={managerForm.password_confirmation}
                  onFocus={() => setFocusedField("manager_password_confirmation")}
                  onBlur={() => setFocusedField((current) => (
                    current === "manager_password_confirmation" ? null : current
                  ))}
                  onChange={(e) =>
                    setManagerForm((current) => ({
                      ...current,
                      password_confirmation: e.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <button
              type="submit"
              style={getActionButtonStyle("manager")}
              onMouseEnter={() => setHoveredAction("manager")}
              onMouseLeave={() => setHoveredAction((current) => (
                current === "manager" ? null : current
              ))}
            >
              Save Manager
            </button>
            {renderInlineNotice("create-manager")}
          </form>

        <div
          style={getSurfaceStyle("panel-managers", styles.panel)}
          onMouseEnter={() => setHoveredSurface("panel-managers")}
          onMouseLeave={() => setHoveredSurface((current) => (
            current === "panel-managers" ? null : current
          ))}
        >
          <h2 style={styles.listSectionTitle}>Managers</h2>
          <p style={styles.listSectionText}>
            Managers created by this owner can later log in and work on assigned
            properties.
          </p>

          {loading ? (
            <p style={styles.emptyText}>Loading managers...</p>
          ) : managers.length === 0 ? (
            <p style={styles.emptyText}>No managers created yet.</p>
          ) : (
            <div className="admin-list-scroll" style={styles.listScrollArea}>
              <div style={styles.stack}>
              {managers.map((manager) => (
                <div
                  key={manager.id}
                  style={getSurfaceStyle(`manager-${manager.id}`, styles.managerCard)}
                  onMouseEnter={() => setHoveredSurface(`manager-${manager.id}`)}
                  onMouseLeave={() => setHoveredSurface((current) => (
                    current === `manager-${manager.id}` ? null : current
                  ))}
                >
                  <div style={styles.managerCardHeader}>
                    <div style={styles.managerIdentity}>
                      <div style={styles.managerAvatar}>
                        {getInitials(manager.name)}
                      </div>
                      <div>
                        <h3 style={styles.itemTitle}>{manager.name}</h3>
                        <p style={styles.managerEmail}>{manager.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => void removeManager(manager.id)}
                      style={styles.managerRemoveBtn}
                    >
                      Remove
                    </button>
                  </div>
                  {renderInlineNotice(`remove-manager-${manager.id}`)}

                  <div style={styles.managerMetaRow}>
                    <span style={styles.metaPill}>
                      Assigned properties: {manager.managed_apartments_count ?? 0}
                    </span>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
        </div>
        </section>
      </div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 26%), linear-gradient(135deg, #0f172a, #020617)",
    padding: "32px",
    color: "#eef6ff",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  pageShell: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  sectionStack: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
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
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "24px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    alignSelf: "start",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  userMeta: {
    minWidth: 0,
    flex: "1 1 220px",
  },
  userName: {
    fontSize: "20px",
    fontWeight: 700,
    marginBottom: "4px",
    lineHeight: 1.2,
  },
  userEmail: {
    color: "#9cb8d0",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  logoutBtn: {
    border: "1px solid rgba(18, 183, 255, 0.22)",
    borderRadius: "999px",
    background:
      "linear-gradient(180deg, rgba(23, 74, 113, 0.95), rgba(15, 52, 81, 0.95))",
    color: "#eef6ff",
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: "13px",
    lineHeight: 1,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 10px 22px rgba(0, 0, 0, 0.18)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gridAutoRows: "1fr",
    gap: "24px",
  },
  statCard: {
    background: "rgba(255, 255, 255, 0.04)",
    borderRadius: "24px",
    padding: "22px",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.16)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "156px",
    height: "100%",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  statCardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 22px 40px rgba(0, 0, 0, 0.22)",
    borderColor: "rgba(90, 212, 255, 0.26)",
  },
  statCardTop: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
  },
  statIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(18, 183, 255, 0.12)",
    color: "#8ee7ff",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
  },
  statLabel: {
    display: "block",
    fontSize: "11px",
    color: "#89a8c2",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: 700,
  },
  statValue: {
    fontSize: "40px",
    color: "#f4fbff",
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  statValueMuted: {
    marginLeft: "6px",
    fontSize: "18px",
    color: "#92b8d4",
    fontWeight: 600,
    letterSpacing: 0,
  },
  notice: {
    borderRadius: "16px",
    padding: "14px 16px",
    fontWeight: 600,
  },
  inlineActionNotice: {
    marginTop: "14px",
    borderRadius: "16px",
    padding: "12px 14px",
    fontWeight: 600,
    lineHeight: 1.5,
  },
  inlineActionNoticeSuccess: {
    background: "rgba(32, 201, 151, 0.14)",
    color: "#8df0cb",
    border: "1px solid rgba(32, 201, 151, 0.2)",
  },
  inlineActionNoticeError: {
    background: "rgba(248, 113, 113, 0.14)",
    color: "#ffb2b2",
    border: "1px solid rgba(248, 113, 113, 0.22)",
  },
  pairNotice: {
    marginBottom: "18px",
  },
  noticeSuccess: {
    background: "rgba(32, 201, 151, 0.14)",
    color: "#8df0cb",
  },
  noticeError: {
    background: "rgba(248, 113, 113, 0.14)",
    color: "#ffb2b2",
  },
  managementSection: {
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "28px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    boxShadow: "0 20px 44px rgba(0, 0, 0, 0.18)",
  },
  managementHeader: {
    marginBottom: "22px",
  },
  managementTitle: {
    margin: "0 0 8px",
    fontSize: "30px",
    color: "#f3fbff",
  },
  managementText: {
    margin: 0,
    color: "#9eb9cf",
    lineHeight: 1.6,
    maxWidth: "720px",
  },
  managementActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
  },
  managementActionCard: {
    width: "100%",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "22px",
    background: "rgba(255, 255, 255, 0.04)",
    padding: "20px",
    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.14)",
    cursor: "pointer",
    textAlign: "left",
    color: "#eef6ff",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  managementActionTitle: {
    fontSize: "20px",
    lineHeight: 1.2,
    color: "#f8fcff",
  },
  managementActionText: {
    color: "#9eb9cf",
    lineHeight: 1.6,
    fontSize: "14px",
  },
  dashboardRows: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  pairedSectionBox: {
    background: "rgba(255, 255, 255, 0.025)",
    borderRadius: "28px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.16)",
  },
  pairedSectionHeader: {
    marginBottom: "16px",
  },
  pairedSectionEyebrow: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "32px",
    padding: "0 14px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.12)",
    border: "1px solid rgba(96, 165, 250, 0.18)",
    color: "#8fdfff",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },
  dashboardPairGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px",
    alignItems: "stretch",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "24px",
  },
  formCard: {
    background: "rgba(255, 255, 255, 0.04)",
    borderRadius: "24px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 18px 34px rgba(0, 0, 0, 0.18)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  formCardHeader: {
    marginBottom: "18px",
  },
  formCardTitle: {
    margin: "0 0 8px",
    fontSize: "25px",
    color: "#f3fbff",
  },
  formCardText: {
    margin: 0,
    color: "#9eb9cf",
    lineHeight: 1.6,
  },
  formFields: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "20px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#c6dced",
    letterSpacing: "0.02em",
  },
  listGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.95fr",
    gap: "24px",
  },
  panel: {
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "24px",
    padding: "24px",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    boxShadow: "0 16px 36px rgba(0, 0, 0, 0.18)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  panelTitle: {
    margin: "0 0 8px",
    fontSize: "28px",
    color: "#f3fbff",
  },
  listSectionTitle: {
    margin: "0 0 8px",
    fontSize: "24px",
    color: "#f3fbff",
  },
  listSectionText: {
    margin: "0 0 18px",
    color: "#9eb9cf",
    lineHeight: 1.6,
    fontSize: "14px",
  },
  panelText: {
    margin: "0 0 18px",
    color: "#aac6dc",
    lineHeight: 1.6,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "18px",
    border: "1px solid rgba(18, 183, 255, 0.18)",
    padding: "14px 16px",
    fontSize: "15px",
    minHeight: "54px",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#eef6ff",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
  },
  inputFocused: {
    borderColor: "rgba(59, 130, 246, 0.88)",
    boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.16)",
    background: "rgba(255, 255, 255, 0.08)",
  },
  selectInput: {
    colorScheme: "dark",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23cbe7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    backgroundSize: "14px",
    paddingRight: "42px",
  },
  selectOption: {
    background: "#0f172a",
    color: "#eef6ff",
  },
  primaryBtn: {
    width: "100%",
    border: "none",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    color: "#f7fcff",
    padding: "15px 18px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 16px 28px rgba(10, 96, 170, 0.28)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
  },
  primaryBtnHover: {
    transform: "translateY(-2px) scale(1.01)",
    filter: "brightness(1.04)",
    boxShadow: "0 22px 34px rgba(10, 96, 170, 0.34)",
  },
  surfaceHover: {
    transform: "translateY(-3px)",
    boxShadow: "0 22px 40px rgba(0, 0, 0, 0.22)",
    borderColor: "rgba(96, 165, 250, 0.2)",
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
    gap: "16px",
  },
  listScrollArea: {
    flex: 1,
    overflowY: "auto",
    maxHeight: "460px",
    paddingRight: "6px",
    marginRight: "-6px",
  },
  propertyCard: {
    borderRadius: "22px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    padding: "22px",
    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.16)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  propertyCardLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 320px)",
    gap: "18px",
    alignItems: "start",
  },
  propertyCardMain: {
    minWidth: 0,
  },
  propertyCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "10px",
  },
  propertyLocationBlock: {
    marginBottom: "14px",
  },
  propertyLabel: {
    display: "block",
    marginBottom: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#84a6c0",
  },
  propertyLocationText: {
    margin: 0,
    color: "#b9d4e7",
    lineHeight: 1.55,
  },
  propertyActionColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "14px",
  },
  managerCard: {
    borderRadius: "22px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    padding: "20px 22px",
    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.16)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  },
  managerCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
  },
  managerIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },
  managerAvatar: {
    width: "46px",
    height: "46px",
    flexShrink: 0,
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(6, 182, 212, 0.22))",
    border: "1px solid rgba(96, 165, 250, 0.24)",
    color: "#d9f6ff",
    fontSize: "14px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  },
  managerEmail: {
    margin: 0,
    color: "#9db8ce",
    lineHeight: 1.45,
    wordBreak: "break-word",
  },
  managerMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "14px",
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
    marginBottom: "14px",
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
  propertyAssignBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  propertySelectGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
    maxWidth: "100%",
  },
  propertyInlineSelect: {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(96, 165, 250, 0.2)",
    padding: "10px 42px 10px 12px",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23cbe7f7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    backgroundSize: "14px",
    color: "#eef6ff",
    outline: "none",
    colorScheme: "dark",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
  },
  propertyAssignmentText: {
    display: "block",
    color: "#92b0c8",
    lineHeight: 1.55,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
    alignSelf: "flex-end",
    border: "none",
    borderRadius: "12px",
    background: "#b94a57",
    color: "#ffffff",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
  managerRemoveBtn: {
    alignSelf: "flex-start",
    border: "1px solid rgba(248, 113, 113, 0.42)",
    borderRadius: "999px",
    background: "rgba(248, 113, 113, 0.08)",
    color: "#ffb6b6",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  emptyText: {
    color: "#aac6dc",
    margin: "8px 0 0",
  },
};

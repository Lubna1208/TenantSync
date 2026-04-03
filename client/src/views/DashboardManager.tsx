import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ManagerHeader from "../components/manager/ManagerHeader";
import StatsCards from "../components/manager/StatsCards";
import ApartmentTable from "../components/manager/ApartmentTable";
import ComplaintsPanel from "../components/manager/ComplaintsPanel";
import MaintenancePanel from "../components/manager/MaintenancePanel";
import QuickActions from "../components/manager/QuickActions";

import {
  statsData,
  apartments,
  complaints,
  maintenanceItems,
  quickActions,
} from "../data/managerData";

import "../styles/managerDashboard.css";

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

export default function DashboardManager() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() =>
    safeParseUser(localStorage.getItem("ts_user"))
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  async function logout() {
    try {
      await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore logout API error
    }

    localStorage.removeItem("ts_user");
    localStorage.removeItem("ts_token");
    setUser(null);
    navigate("/login");
  }

  if (!user) return null;

  return (
    <div className="manager-dashboard">
      <div className="dashboard-container">
        <ManagerHeader
          user={{
            name: user.name || "Manager One",
            email: user.email || "manager@tenantsync.com",
          }}
          onLogout={logout}
        />

        <StatsCards
          stats={statsData}
          activeFilter={activeFilter}
          onCardClick={setActiveFilter}
        />

        <div className="quick-actions-section">
          <QuickActions actions={quickActions} />
        </div>

        <div className="dashboard-main-grid">
          <div>
            <ApartmentTable
              apartments={apartments}
              searchTerm={searchTerm}
              activeFilter={activeFilter}
              setSearchTerm={setSearchTerm}
            />
          </div>

          <div className="dashboard-right-column">
            <ComplaintsPanel complaints={complaints} />
            <MaintenancePanel maintenanceItems={maintenanceItems} />
          </div>
        </div>
      </div>
    </div>
  );
}
type MaintenanceItem = {
  id: number;
  title: string;
  unit: string;
  assignedPerson: string;
  status: string;
  eta: string;
};

type MaintenancePanelProps = {
  maintenanceItems: MaintenanceItem[];
};

export default function MaintenancePanel({
  maintenanceItems,
}: MaintenancePanelProps) {
  const getMaintenanceStatusClass = (status: string) => {
    const value = status.toLowerCase();

    if (value === "pending") return "status-badge pending";
    if (value === "assigned") return "status-badge assigned";
    if (value === "in progress") return "status-badge in-progress";
    if (value === "completed") return "status-badge completed";

    return "status-badge";
  };

  return (
    <div className="dashboard-panel">
      <h3>Maintenance Tasks</h3>

      <div className="maintenance-list">
        {maintenanceItems.length > 0 ? (
          maintenanceItems.map((item) => (
            <div key={item.id} className="maintenance-item">
              <div className="maintenance-top">
                <h4>{item.title}</h4>
                <span className={getMaintenanceStatusClass(item.status)}>
                  {item.status}
                </span>
              </div>

              <p>
                <strong>Unit:</strong> {item.unit}
              </p>

              <p>
                <strong>Assigned:</strong> {item.assignedPerson}
              </p>

              <p>
                <strong>ETA:</strong> {item.eta}
              </p>
            </div>
          ))
        ) : (
          <p className="empty-text">No maintenance tasks found.</p>
        )}
      </div>
    </div>
  );
}
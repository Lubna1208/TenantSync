type ComplaintItem = {
  id: number;
  title: string;
  unit: string;
  tenant: string;
  priority: string;
  time: string;
  status: string;
};

type ComplaintsPanelProps = {
  complaints: ComplaintItem[];
};

export default function ComplaintsPanel({
  complaints,
}: ComplaintsPanelProps) {
  const getPriorityBadgeClass = (priority: string) => {
    const value = priority.toLowerCase();

    if (value === "high") return "priority-badge high";
    if (value === "medium") return "priority-badge medium";
    if (value === "low") return "priority-badge low";

    return "priority-badge";
  };

  const getStatusBadgeClass = (status: string) => {
    const value = status.toLowerCase();

    if (value === "pending") return "status-badge pending";
    if (value === "resolved") return "status-badge resolved";
    if (value === "in progress") return "status-badge occupied";

    return "status-badge";
  };

  return (
    <div className="dashboard-panel">
      <h3>Recent Complaints</h3>

      <div className="complaints-list">
        {complaints.length > 0 ? (
          complaints.map((complaint) => (
            <div key={complaint.id} className="complaint-item">
              <div className="complaint-top">
                <h4>{complaint.title}</h4>
                <span className={getPriorityBadgeClass(complaint.priority)}>
                  {complaint.priority}
                </span>
              </div>

              <p>
                <strong>Unit:</strong> {complaint.unit}
              </p>

              <p>
                <strong>Tenant:</strong> {complaint.tenant}
              </p>

              <p>
                <strong>Time:</strong> {complaint.time}
              </p>

              <div className="complaint-footer">
                <span className={getStatusBadgeClass(complaint.status)}>
                  {complaint.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-text">No complaints found.</p>
        )}
      </div>
    </div>
  );
}
type ActionItem = {
  id: number;
  label: string;
  description: string;
  icon: string;
};

type QuickActionsProps = {
  actions: ActionItem[];
};

export default function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="dashboard-panel">
      <h3>Quick Actions</h3>
      <div className="quick-actions-grid">
        {actions.map((action) => (
          <div key={action.id} className="quick-action-card">
            <div className="quick-action-icon">{action.icon}</div>
            <div>
              <h4 className="quick-action-title">{action.label}</h4>
              <p className="quick-action-desc">{action.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
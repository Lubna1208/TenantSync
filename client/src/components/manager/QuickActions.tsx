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
    <div className="quick-actions-panel">
      <div className="quick-actions-header">
        <h3>Quick Actions</h3>
        <p>Your assigned property, tenant activity, and open issues in one place.</p>
      </div>

      <div className="quick-actions-grid">
        {actions.map((action) => (
          <div key={action.id} className="quick-action-card">
            <div className="quick-action-content">
              <span className="quick-action-eyebrow">{action.icon}</span>
              <h4 className="quick-action-title">{action.label}</h4>
              <p className="quick-action-desc">{action.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

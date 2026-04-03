type StatItem = {
  id: string;
  label: string;
  value: number | string;
  note?: string;
  icon?: string;
};

type StatsCardsProps = {
  stats: StatItem[];
  activeFilter: string;
  onCardClick: (filterKey: string) => void;
};

export default function StatsCards({
  stats,
  activeFilter,
  onCardClick,
}: StatsCardsProps) {
  return (
    <div className="stats-grid">
      {stats.map((item) => {
        const isActive = activeFilter === item.id;

        return (
          <div
            key={item.id}
            className={`dashboard-panel stats-card ${isActive ? "active-stat-card" : ""}`}
            onClick={() => onCardClick(item.id)}
            style={{
              cursor: "pointer",
              border: isActive ? "2px solid #2c3e50" : "2px solid transparent",
              transition: "0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "10px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  {item.label}
                </p>

                <h3
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "28px",
                    fontWeight: "700",
                  }}
                >
                  {item.value}
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "#888",
                  }}
                >
                  {item.note || "No additional note"}
                </p>
              </div>

              <div
                style={{
                  fontSize: "28px",
                  lineHeight: 1,
                }}
              >
                {item.icon || "📊"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
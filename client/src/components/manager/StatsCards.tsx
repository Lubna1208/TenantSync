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

function StatIcon({ statId }: { statId: string }) {
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

  switch (statId) {
    case "all":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M5 21h14" />
          <path d="M7 21V9l5-4 5 4v12" />
          <path d="M10 13h4" />
          <path d="M10 17h4" />
        </svg>
      );
    case "created":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
    case "occupied":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M7 12l3 3 7-7" />
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9Z" />
        </svg>
      );
    case "vacant":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M8 8h8v8H8z" />
          <path d="M4 4h16v16H4z" />
        </svg>
      );
    case "active":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 3v18" />
          <path d="M7 8l5-5 5 5" />
          <path d="M6 21h12" />
        </svg>
      );
    case "expired":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 8v4l3 3" />
          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 6v6l4 2" />
          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9Z" />
        </svg>
      );
  }
}

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
            className={`stats-card ${isActive ? "active-stat-card" : ""}`}
            onClick={() => onCardClick(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onCardClick(item.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="stats-card-top">
              <div className="stats-card-icon">
                <StatIcon statId={item.id} />
              </div>
              <span className="stats-card-label">{item.label}</span>
            </div>

            <div className="stats-card-value">{item.value}</div>
            <p className="stats-card-note">{item.note || "No additional note"}</p>
          </div>
        );
      })}
    </div>
  );
}

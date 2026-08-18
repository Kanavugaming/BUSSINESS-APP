import './stat-card.css';

export default function StatCard({ label, value, icon: Icon, tone = 'indigo', hint }) {
  return (
    <div className={`stat-card glass tone-${tone}`}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <span className="stat-card-icon">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="stat-card-value mono">{value}</p>
      {hint && <p className="stat-card-hint">{hint}</p>}
    </div>
  );
}

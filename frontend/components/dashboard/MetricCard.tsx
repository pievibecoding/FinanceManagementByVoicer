interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  icon: string;
  positive?: boolean;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function MetricCard({ title, value, trend, icon, positive = true, onClick, selected = false, className = '' }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-[var(--radius)] p-6 backdrop-blur-sm transition-all cursor-pointer ${
        selected ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-muted/40'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs ${positive ? 'text-primary' : 'text-destructive'}`}>
            {positive ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <h3 className="text-muted-foreground text-sm uppercase mb-1">{title}</h3>
      <p className="text-foreground text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

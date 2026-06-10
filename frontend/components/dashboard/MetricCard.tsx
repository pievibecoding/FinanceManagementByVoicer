import { StatCard } from '@/components/common'

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
    <StatCard
      onClick={onClick}
      selected={selected}
      className={className}
      icon={icon}
      title={title}
      value={value}
      trend={
        trend ? (
          <span className={`text-xs ${selected ? 'text-white/80' : positive ? 'text-primary' : 'text-destructive'}`}>
            {positive ? '↑' : '↓'} {trend}
          </span>
        ) : null
      }
    />
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  icon: string;
  positive?: boolean;
}

export function MetricCard({ title, value, trend, icon, positive = true }: MetricCardProps) {
  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-6 backdrop-blur-sm hover:bg-white/10 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs ${positive ? 'text-[#74d3ae]' : 'text-[#dd9787]'}`}>
            {positive ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <h3 className="text-white/60 text-sm uppercase mb-1">{title}</h3>
      <p className="text-white text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

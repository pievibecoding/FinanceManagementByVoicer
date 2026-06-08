interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  icon: string;
  positive?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export function MetricCard({ title, value, trend, icon, positive = true, onClick, selected = false }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/6 border rounded-[0.625rem] p-6 backdrop-blur-sm transition-all cursor-pointer ${
        selected ? 'border-[#74d3ae]/60 bg-[#74d3ae]/10' : 'border-white/18 hover:bg-white/10'
      }`}
    >
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

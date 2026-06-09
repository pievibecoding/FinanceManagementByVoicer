import type { MonthlyTrend } from '@/api/analytics';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';

interface MonthlyTrendsProps {
  data: MonthlyTrend[];
}

export function MonthlyTrends({ data }: MonthlyTrendsProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormat();

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[var(--radius)] p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">{t('analytics.monthlyTrends')}</h3>
        <div className="text-muted-foreground text-center py-8">{t('analytics.noData')}</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expense, d.investment)));

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{t('analytics.monthlyTrends')}</h3>
      <div className="space-y-4">
        {data.map((trend) => (
          <div key={trend.month} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{trend.month}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-primary">{t('types.income')}: {formatCurrency(trend.income)}</span>
                <span className="text-destructive">{t('types.expense')}: {formatCurrency(trend.expense)}</span>
                <span className="text-sky-400">{t('types.investment')}: {formatCurrency(trend.investment)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-16 text-muted-foreground text-xs">{t('types.income')}</div>
                <div className="flex-1 bg-border/40 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(trend.income / maxValue) * 100}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 text-muted-foreground text-xs">{t('types.expense')}</div>
                <div className="flex-1 bg-border/40 rounded-full h-2">
                  <div className="bg-destructive h-2 rounded-full transition-all" style={{ width: `${(trend.expense / maxValue) * 100}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 text-muted-foreground text-xs">{t('analytics.investShort')}</div>
                <div className="flex-1 bg-border/40 rounded-full h-2">
                  <div className="bg-sky-400 h-2 rounded-full transition-all" style={{ width: `${(trend.investment / maxValue) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground text-sm">{t('analytics.net')}</span>
              <span className={`text-sm font-medium ${trend.net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(trend.net)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

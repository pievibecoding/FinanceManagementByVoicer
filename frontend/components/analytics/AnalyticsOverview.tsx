import type { AnalyticsOverview } from '@/api/analytics';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';

interface AnalyticsOverviewProps {
  data: AnalyticsOverview;
}

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormat();

  const cards = [
    {
      label: t('analytics.totalIncome'),
      value: formatCurrency(data.total_income),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
    },
    {
      label: t('analytics.totalExpense'),
      value: formatCurrency(data.total_expense),
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
    },
    {
      label: t('analytics.totalInvestment'),
      value: formatCurrency(data.total_investment),
      color: 'text-[var(--baby-blue-ice)]',
      bgColor: 'bg-[var(--baby-blue-ice)]/10',
      borderColor: 'border-[var(--baby-blue-ice)]/30',
    },
    {
      label: t('analytics.netBalance'),
      value: formatCurrency(data.net_balance),
      color: data.net_balance >= 0 ? 'text-primary' : 'text-destructive',
      bgColor: data.net_balance >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
      borderColor: data.net_balance >= 0 ? 'border-primary/30' : 'border-destructive/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className={`${card.bgColor} ${card.borderColor} border rounded-[var(--radius)] p-4 backdrop-blur-sm`}>
          <p className="text-muted-foreground text-sm mb-1">{card.label}</p>
          <p className={`${card.color} text-2xl font-bold`}>{card.value}</p>
        </div>
      ))}
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 backdrop-blur-sm md:col-span-2 lg:col-span-4">
        <p className="text-muted-foreground text-sm mb-1">{t('analytics.totalTransactions')}</p>
        <p className="text-foreground text-2xl font-bold">{data.transaction_count}</p>
      </div>
    </div>
  );
}

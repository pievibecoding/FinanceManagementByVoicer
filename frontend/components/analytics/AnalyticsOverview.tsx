import type { AnalyticsOverview } from '@/api/analytics';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';

interface AnalyticsOverviewProps {
  data: AnalyticsOverview;
}

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormat();
  const totalExpense = data.total_expense + (data.total_investment ?? 0);

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
      value: formatCurrency(totalExpense),
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <AppCard key={index} className={`${card.bgColor} ${card.borderColor} rounded-[var(--radius)] p-4`}>
          <p className="text-muted-foreground text-sm mb-1">{card.label}</p>
          <p className={`${card.color} text-2xl font-bold`}>{card.value}</p>
        </AppCard>
      ))}
      <AppCard className="rounded-[var(--radius)] p-4 md:col-span-3">
        <p className="text-muted-foreground text-sm mb-1">{t('analytics.totalTransactions')}</p>
        <p className="text-foreground text-2xl font-bold">{data.transaction_count}</p>
      </AppCard>
    </div>
  );
}

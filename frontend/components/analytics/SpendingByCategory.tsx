import type { CategorySpending } from '@/api/analytics';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';
import type { Category } from '@/api/categories';
import { getCategoryColorByName } from '@/lib/category-display';

interface SpendingByCategoryProps {
  data: CategorySpending[];
  categories?: Category[];
}

export function SpendingByCategory({ data, categories = [] }: SpendingByCategoryProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormat();

  if (!data || data.length === 0) {
    return (
      <AppCard className="rounded-[var(--radius)] p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">{t('analytics.spendingByCategory')}</h3>
        <div className="text-muted-foreground text-center py-8">{t('analytics.noData')}</div>
      </AppCard>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.total_amount));

  return (
    <AppCard className="rounded-[var(--radius)] p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{t('analytics.spendingByCategory')}</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const color = getCategoryColorByName(item.category_name, categories, index)
          return (
          <div key={item.category_name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-foreground font-medium capitalize">{item.category_name}</span>
                <span className="text-muted-foreground text-sm capitalize">({item.category_type})</span>
              </div>
              <div className="text-right">
                <span className="text-foreground font-medium">{formatCurrency(item.total_amount)}</span>
                <span className="text-muted-foreground text-sm ml-2">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-border/40 rounded-full h-2">
              <div className="h-2 rounded-full transition-all"
                style={{
                  width: `${(item.total_amount / maxAmount) * 100}%`,
                  backgroundColor: color,
                }} />
            </div>
            <div className="text-muted-foreground text-sm">
              {t('analytics.transactionCount', { count: item.transaction_count })}
            </div>
          </div>
        )})}
      </div>
    </AppCard>
  );
}

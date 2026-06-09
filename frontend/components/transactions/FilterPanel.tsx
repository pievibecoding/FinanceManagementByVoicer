import { useTranslation } from 'react-i18next';

interface FilterPanelProps {
  filters: {
    startDate?: string;
    endDate?: string;
    type?: string;
    categoryId?: string;
    accountId?: string;
    search?: string;
  };
  onFiltersChange: (filters: FilterPanelProps['filters']) => void;
  onClearFilters: () => void;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary';

export function FilterPanel({ filters, onFiltersChange, onClearFilters }: FilterPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-4 backdrop-blur-sm mb-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-muted-foreground text-sm mb-1">{t('transactions.search')}</label>
          <input type="text" placeholder={t('transactions.searchPlaceholder')} value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className={INPUT_CLS} />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-muted-foreground text-sm mb-1">{t('transactions.startDate')}</label>
          <input type="date" value={filters.startDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className={INPUT_CLS} />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-muted-foreground text-sm mb-1">{t('transactions.endDate')}</label>
          <input type="date" value={filters.endDate || ''}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className={INPUT_CLS} />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-muted-foreground text-sm mb-1">{t('transactions.type')}</label>
          <select value={filters.type || ''}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value || undefined })}
            className={INPUT_CLS}>
            <option value="">{t('transactions.allTypes')}</option>
            <option value="income">{t('types.income')}</option>
            <option value="expense">{t('types.expense')}</option>
            <option value="investment">{t('types.investment')}</option>
          </select>
        </div>

        <button onClick={onClearFilters}
          className="px-4 py-2 bg-secondary border border-border rounded-lg text-secondary-foreground hover:bg-secondary/80 transition-all">
          {t('transactions.clearFilters')}
        </button>
      </div>
    </div>
  );
}

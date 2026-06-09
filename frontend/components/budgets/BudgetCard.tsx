import type { Budget } from '@/api/budgets';
import type { Category } from '@/api/categories';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';

interface BudgetCardProps {
  budget: Budget;
  category: Category;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}

export function BudgetCard({ budget, category, onEdit, onDelete }: BudgetCardProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormat();

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <h3 className="text-foreground font-medium capitalize">{category.category_name}</h3>
            <p className="text-muted-foreground text-sm capitalize">{t(`types.${category.category_type}`, category.category_type)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(budget)} className="text-muted-foreground hover:text-foreground transition-colors">
            {t('common.edit')}
          </button>
          <button onClick={() => onDelete(budget)} className="text-destructive hover:text-destructive/80 transition-colors">
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('budgets.limit')}</span>
          <span className="text-foreground font-medium">{formatCurrency(budget.amount_limit)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('budgets.month')}</span>
          <span className="text-foreground font-medium">{budget.month}</span>
        </div>
      </div>
    </div>
  );
}

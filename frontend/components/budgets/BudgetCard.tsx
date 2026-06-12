import type { Budget } from '@/api/budgets';
import type { Category } from '@/api/categories';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { CategoryAccentCard } from '@/components/common';
import { getCategoryIconGlyph } from '@/lib/category-icons';

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
    <CategoryAccentCard
      color={category.color}
      icon={getCategoryIconGlyph(category.icon)}
      title={category.category_name}
      subtitle={t(`types.${category.category_type}`, category.category_type)}
      onClick={() => onEdit(budget)}
      actions={(
        <>
          <button onClick={(event) => { event.stopPropagation(); onEdit(budget); }} className="text-muted-foreground hover:text-foreground transition-colors">
            {t('common.edit')}
          </button>
          <button onClick={(event) => { event.stopPropagation(); onDelete(budget); }} className="text-destructive hover:text-destructive/80 transition-colors">
            {t('common.delete')}
          </button>
        </>
      )}
    >
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
    </CategoryAccentCard>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpsertBudget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import type { Budget } from '@/api/budgets';
import { FormDialog } from '@/components/common';
import { Button } from '@/components/ui/button';

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
}

function normalizeId(value: string | number | null | undefined) {
  return value == null ? '' : String(value);
}

export function EditBudgetModal({ isOpen, onClose, budget }: EditBudgetModalProps) {
  const { t } = useTranslation();
  const [amountLimit, setAmountLimit] = useState<number>(budget.amount_limit);
  const upsertBudget = useUpsertBudget();
  const { data: categories } = useCategories();

  useEffect(() => { setAmountLimit(budget.amount_limit); }, [budget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountLimit) return;
    upsertBudget.mutate(
      { categoryId: budget.category_id, amountLimit, month: budget.month },
      { onSuccess: () => { onClose(); } }
    );
  };

  const category = categories?.find(c => normalizeId(c.category_id) === normalizeId(budget.category_id));

  return (
    <FormDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }} title={t('budgets.edit')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-2">{t('budgets.category')}</label>
            <input type="text" value={category?.category_name || ''}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-muted-foreground focus:outline-none" disabled />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-2">{t('budgets.limitVnd')}</label>
            <input type="number" value={amountLimit || ''} onChange={(e) => setAmountLimit(Number(e.target.value))}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-foreground focus:outline-none focus:border-primary"
              placeholder={t('budgets.placeholder')} min="0" required />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-2">{t('budgets.month')}</label>
            <input type="text" value={budget.month}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-muted-foreground focus:outline-none" disabled />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={upsertBudget.isPending} className="flex-1">
              {upsertBudget.isPending ? t('common.updating') : t('budgets.edit')}
            </Button>
          </div>
        </form>
    </FormDialog>
  );
}

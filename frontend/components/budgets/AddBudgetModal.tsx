import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpsertBudget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/api/categories';
import { FormDialog } from '@/components/common';
import { Button } from '@/components/ui/button';

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string;
}

export function AddBudgetModal({ isOpen, onClose, month }: AddBudgetModalProps) {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState<number>();
  const [amountLimit, setAmountLimit] = useState<number>();
  const upsertBudget = useUpsertBudget();
  const { data: categories } = useCategories();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amountLimit) return;
    upsertBudget.mutate({ categoryId, amountLimit, month }, {
      onSuccess: () => { onClose(); setCategoryId(undefined); setAmountLimit(undefined); },
    });
  };

  return (
    <FormDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }} title={t('budgets.add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-2">{t('budgets.category')}</label>
            <select value={categoryId || ''} onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-foreground focus:outline-none focus:border-primary" required>
              <option value="">{t('budgets.selectCategory')}</option>
              {categories?.map((category: Category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name} ({category.category_type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-2">{t('budgets.limitVnd')}</label>
            <input type="number" value={amountLimit || ''} onChange={(e) => setAmountLimit(Number(e.target.value))}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-foreground focus:outline-none focus:border-primary"
              placeholder={t('budgets.placeholder')} min="0" required />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-2">{t('budgets.month')}</label>
            <input type="text" value={month}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-muted-foreground focus:outline-none" disabled />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={upsertBudget.isPending} className="flex-1">
              {upsertBudget.isPending ? t('common.adding') : t('budgets.add')}
            </Button>
          </div>
        </form>
    </FormDialog>
  );
}

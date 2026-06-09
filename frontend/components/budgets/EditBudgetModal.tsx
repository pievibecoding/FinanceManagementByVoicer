import { useState, useEffect } from 'react';
import { useUpsertBudget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import type { Budget } from '@/api/budgets';
import type { Category } from '@/api/categories';

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
}

export function EditBudgetModal({ isOpen, onClose, budget }: EditBudgetModalProps) {
  const [amountLimit, setAmountLimit] = useState<number>(budget.amount_limit);
  const upsertBudget = useUpsertBudget();
  const { data: categories } = useCategories();

  useEffect(() => {
    setAmountLimit(budget.amount_limit);
  }, [budget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountLimit) return;

    upsertBudget.mutate(
      { categoryId: budget.category_id, amountLimit, month: budget.month },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  if (!isOpen) return null;

  const category = categories?.find(c => c.category_id === String(budget.category_id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md backdrop-blur-sm">
        <h2 className="text-xl font-bold text-foreground mb-4">Edit Budget</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-2">Category</label>
            <input type="text" value={category?.category_name || ''}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-muted-foreground focus:outline-none" disabled />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-2">Budget Limit (VND)</label>
            <input type="number" value={amountLimit || ''} onChange={(e) => setAmountLimit(Number(e.target.value))}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-foreground focus:outline-none focus:border-primary"
              placeholder="Enter budget limit" min="0" required />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-2">Month</label>
            <input type="text" value={budget.month}
              className="w-full bg-input border border-border rounded-[var(--radius)] p-3 text-muted-foreground focus:outline-none" disabled />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 bg-secondary border border-border text-secondary-foreground py-2 px-4 rounded-[var(--radius)] hover:bg-secondary/80 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={upsertBudget.isPending}
              className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-[var(--radius)] hover:bg-primary/80 transition-colors font-medium disabled:opacity-50">
              {upsertBudget.isPending ? 'Updating...' : 'Update Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

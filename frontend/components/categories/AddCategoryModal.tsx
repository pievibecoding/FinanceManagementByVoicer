import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddCategory } from '@/hooks/useCategories';
import { defaultCategoryColor } from '@/styles/tokens';

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
type CategoryFormData = {
  category_name: string;
  category_type: string;
  icon: string;
  color: string;
};

export function AddCategoryModal({ open, onOpenChange }: AddCategoryModalProps) {
  const { t } = useTranslation();
  const addCategory = useAddCategory();
  const EMPTY: CategoryFormData = { category_name: '', category_type: 'expense', icon: '📦', color: defaultCategoryColor };
  const [formData, setFormData] = useState(EMPTY);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCategory.mutate(formData, {
      onSuccess: () => { onOpenChange(false); setFormData(EMPTY); },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('categories.add')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('categories.name')}</label>
            <input type="text" value={formData.category_name}
              onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              className={INPUT_CLS} required />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('categories.type')}</label>
            <select value={formData.category_type}
              onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
              className={INPUT_CLS} required>
              <option value="income">{t('types.income')}</option>
              <option value="expense">{t('types.expense')}</option>
              <option value="investment">{t('types.investment')}</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('categories.icon')}</label>
            <input type="text" value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className={INPUT_CLS} required maxLength={2} />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('categories.color')}</label>
            <div className="flex gap-2">
              <input type="color" value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-10 bg-input border border-border rounded-lg cursor-pointer" />
              <input type="text" value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className={`flex-1 ${INPUT_CLS}`} required />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-secondary-foreground hover:bg-secondary/80 transition-all">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={addCategory.isPending}
              className="flex-1 px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
              {addCategory.isPending ? t('common.adding') : t('categories.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

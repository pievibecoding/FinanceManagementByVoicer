import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateCategory } from '@/hooks/useCategories';
import type { Category } from '@/api/categories';
import { defaultCategoryColor } from '@/styles/tokens';

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
type CategoryFormData = {
  category_name: string;
  category_type: string;
  icon: string;
  color: string;
};

export function EditCategoryModal({ open, onOpenChange, category }: EditCategoryModalProps) {
  const { t } = useTranslation();
  const updateCategory = useUpdateCategory();
  const [formData, setFormData] = useState<CategoryFormData>({
    category_name: '', category_type: 'expense', icon: '📦', color: defaultCategoryColor,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        category_type: category.category_type,
        icon: category.icon,
        color: category.color,
      });
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    updateCategory.mutate({ categoryId: category.category_id, category: formData }, {
      onSuccess: () => { onOpenChange(false); },
    });
  };

  if (!open || !category) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('categories.edit')}</h2>
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
            <button type="submit" disabled={updateCategory.isPending}
              className="flex-1 px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
              {updateCategory.isPending ? t('common.updating') : t('categories.edit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

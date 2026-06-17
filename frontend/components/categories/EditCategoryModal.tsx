import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateCategory } from '@/hooks/useCategories';
import type { Category } from '@/api/categories';
import { defaultCategoryColor } from '@/styles/tokens';
import { FormDialog } from '@/components/common';
import { Button } from '@/components/ui/button';
import { CategoryIconPicker } from './CategoryIconPicker';
import { defaultCategoryIcon, normalizeCategoryIcon } from '@/lib/category-icons';

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
    category_name: '', category_type: 'expense', icon: defaultCategoryIcon, color: defaultCategoryColor,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        category_type: category.category_type === 'investment' ? 'expense' : category.category_type,
        icon: normalizeCategoryIcon(category.icon),
        color: category.color || defaultCategoryColor,
      });
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    updateCategory.mutate({ categoryId: category.category_id, category: formData }, {
      onSuccess: () => { onOpenChange(false); },
      onError: (error) => {
        console.error('[categories] edit failed', {
          categoryId: category.category_id,
          payload: formData,
          error,
        });
      },
    });
  };

  if (!category) return null;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t('categories.edit')}>
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
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('categories.icon')}</label>
            <CategoryIconPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
            />
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
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateCategory.isPending} className="flex-1">
              {updateCategory.isPending ? t('common.updating') : t('categories.edit')}
            </Button>
          </div>
        </form>
    </FormDialog>
  );
}

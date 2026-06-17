import type { Category } from '@/api/categories';
import { useTranslation } from 'react-i18next';
import { CategoryAccentCard } from '@/components/common';
import { getCategoryIconGlyph } from '@/lib/category-icons';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const { t } = useTranslation();
  return (
    <CategoryAccentCard
      color={category.color}
      icon={getCategoryIconGlyph(category.icon)}
      title={category.category_name}
      subtitle={t(`types.${category.category_type}`, category.category_type)}
      onClick={() => onEdit(category)}
      actions={(
        <>
          <button
            onClick={(event) => { event.stopPropagation(); onEdit(category); }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); onDelete(category.category_id); }}
            className="text-destructive transition-colors hover:text-destructive/80"
          >
            {t('common.delete')}
          </button>
        </>
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{t('categories.color')}</span>
          <span className="text-foreground font-medium">{category.color}</span>
        </div>
      </div>
    </CategoryAccentCard>
  );
}

import type { Category } from '@/api/categories';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-4 backdrop-blur-sm hover:bg-muted/40 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ backgroundColor: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <h3 className="text-foreground font-medium">{category.category_name}</h3>
            <p className="text-muted-foreground text-sm capitalize">{category.category_type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(category)}
            className="p-1.5 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">
            ✏️
          </button>
          <button onClick={() => onDelete(category.category_id)}
            className="p-1.5 bg-destructive/20 border border-destructive/30 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/30 transition-all">
            🗑️
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
          <span className="text-muted-foreground text-sm">{category.color}</span>
        </div>
      </div>
    </div>
  );
}

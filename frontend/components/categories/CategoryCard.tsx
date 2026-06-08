import type { Category } from '@/api/categories';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ backgroundColor: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <h3 className="text-white font-medium">{category.category_name}</h3>
            <p className="text-white/60 text-sm capitalize">{category.category_type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(category)}
            className="p-1.5 bg-white/10 border border-white/18 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-all"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(category.category_id)}
            className="p-1.5 bg-[#dd9787]/20 border border-[#dd9787]/30 rounded-lg text-[#dd9787]/60 hover:text-[#dd9787] hover:bg-[#dd9787]/30 transition-all"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-white/60 text-sm">{category.color}</span>
        </div>
      </div>
    </div>
  );
}

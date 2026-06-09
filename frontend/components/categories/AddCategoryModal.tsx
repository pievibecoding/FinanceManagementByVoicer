import { useState } from 'react';
import { useAddCategory } from '@/hooks/useCategories';
import { defaultCategoryColor } from '@/styles/tokens';

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCategoryModal({ open, onOpenChange }: AddCategoryModalProps) {
  const addCategory = useAddCategory();
  
  const [formData, setFormData] = useState({
    category_name: '',
    category_type: 'expense',
    icon: '📦',
    color: defaultCategoryColor,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCategory.mutate(formData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          category_name: '',
          category_type: 'expense',
          icon: '📦',
          color: defaultCategoryColor,
        });
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-4">Add Category</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Category Name</label>
            <input type="text" value={formData.category_name} onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Category Type</label>
            <select value={formData.category_type} onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Icon</label>
            <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required maxLength={2} />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Color</label>
            <div className="flex gap-2">
              <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-12 h-10 bg-input border border-border rounded-lg cursor-pointer" />
              <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-secondary-foreground hover:bg-secondary/80 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={addCategory.isPending}
              className="flex-1 px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
              {addCategory.isPending ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

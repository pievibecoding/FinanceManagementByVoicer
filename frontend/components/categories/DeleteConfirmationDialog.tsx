import { useDeleteCategory } from '@/hooks/useCategories';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
}

export function DeleteConfirmationDialog({ open, onOpenChange, categoryId }: DeleteConfirmationDialogProps) {
  const deleteCategory = useDeleteCategory();

  const handleConfirm = () => {
    if (!categoryId) return;
    
    deleteCategory.mutate(categoryId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Category"
      desc="Are you sure you want to delete this category? This action cannot be undone."
      handleConfirm={handleConfirm}
      confirmText="Delete"
      cancelBtnText="Cancel"
      isLoading={deleteCategory.isPending}
      destructive
    />
  );
}

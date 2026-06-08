import { useDeleteBudget } from '@/hooks/useBudgets';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  budget: {
    category_id: number;
    month: string;
  };
}

export function DeleteConfirmationDialog({ isOpen, onClose, budget }: DeleteConfirmationDialogProps) {
  const deleteBudget = useDeleteBudget();

  const handleConfirm = () => {
    deleteBudget.mutate(
      { categoryId: budget.category_id, month: budget.month },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Delete Budget"
      desc="Are you sure you want to delete this budget? This action cannot be undone."
      handleConfirm={handleConfirm}
      isLoading={deleteBudget.isPending}
      destructive
    />
  );
}

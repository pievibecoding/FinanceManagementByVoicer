import { useTranslation } from 'react-i18next';
import { useDeleteBudget } from '@/hooks/useBudgets';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  budget: { category_id: number; month: string };
}

export function DeleteConfirmationDialog({ isOpen, onClose, budget }: DeleteConfirmationDialogProps) {
  const { t } = useTranslation();
  const deleteBudget = useDeleteBudget();

  const handleConfirm = () => {
    deleteBudget.mutate(
      { categoryId: budget.category_id, month: budget.month },
      { onSuccess: () => { onClose(); } }
    );
  };

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={onClose}
      title={t('budgets.deleteTitle')}
      desc={t('budgets.deleteDescription')}
      handleConfirm={handleConfirm}
      confirmText={t('common.delete')}
      cancelBtnText={t('common.cancel')}
      isLoading={deleteBudget.isPending}
      destructive
    />
  );
}
